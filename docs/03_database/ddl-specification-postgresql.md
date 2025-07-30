# PostgreSQL マイグレーションファイル実装仕様書

## 目的

本仕様書は、MonsteraプロジェクトにおけるPostgreSQLデータベースマイグレーションファイルの実装ルールを定義します。これにより、一貫性のあるデータベーススキーマ管理を実現し、チーム全体での協調作業を円滑に進めることを目的としています。

## マイグレーションファイルの名前付け規則

### 命名パターン

マイグレーションファイルは以下の命名パターンに従って作成します：

```
NNNNNN_description.(up|down).sql
```

- `NNNNNN`: 6桁の連番（000001から開始）
- `description`: マイグレーションの内容を簡潔に表す英語の説明（スネークケース）
- `up`: スキーマを前進させるSQL
- `down`: スキーマを後退させるSQL

### 例

```
000001_create_users_table.up.sql
000001_create_users_table.down.sql
000012_create_notifications_tables.up.sql
000012_create_notifications_tables.down.sql
```

## SQLの記述ルール

### 基本構文

- キーワードは大文字で記述する（例: `CREATE TABLE`, `NOT NULL`）
- 識別子（テーブル名、カラム名）はスネークケースで記述する
- 各ステートメントの末尾にはセミコロン（`;`）を付ける
- 適切にインデントと改行を入れ、可読性を確保する

### テーブル作成時の注意点

テーブル作成時は、以下の要素を必ず含めます：

1. `IF NOT EXISTS`句を使用する
2. PostgreSQL標準の型を使用する
3. カラムにはコメントを追加する
4. 適切な外部キー制約を設定する
5. 必要なインデックスを作成する
6. 作成日時・更新日時・削除日時のカラムを設ける

### 例

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- インデックスの作成
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- テーブルコメント
COMMENT ON TABLE users IS 'ユーザーテーブル';

-- カラムコメント
COMMENT ON COLUMN users.username IS 'ユーザー名';
COMMENT ON COLUMN users.email IS 'メールアドレス';
COMMENT ON COLUMN users.created_at IS '作成日時';
COMMENT ON COLUMN users.updated_at IS '更新日時';
COMMENT ON COLUMN users.deleted_at IS '削除日時';
```

## アップグレードとダウングレード

### アップグレード（up.sql）

- 新しいテーブル、カラム、インデックス、制約を追加する操作
- アップグレードスクリプトは必ず対応するダウングレードスクリプトと一緒に作成する
- 冪等性を確保するため、`IF NOT EXISTS`や`IF EXISTS`を適切に使用する

### ダウングレード（down.sql）

- アップグレードスクリプトによる変更を完全に元に戻す操作
- アップグレードの逆順で操作を記述する
- 例えば、アップグレードでテーブルを作成した場合、ダウングレードではそのテーブルを削除する

## 外部キー制約の命名規則

外部キー制約は以下の命名パターンに従います：

```
fk_{子テーブル名}_{親テーブル名}
```

または

```
fk_{子テーブル名}_{参照カラム名}
```

### 例

```sql
ALTER TABLE user_notifications 
ADD CONSTRAINT fk_user_notifications_user 
FOREIGN KEY (user_id) REFERENCES users(id);
```

## インデックスの命名規則

インデックスは以下の命名パターンに従います：

- 通常のインデックス: `idx_{テーブル名}_{カラム名}`
- ユニークインデックス: `uq_{テーブル名}_{カラム名}`
- 複合インデックス: `idx_{テーブル名}_{カラム名1}_{カラム名2}`

### 例

```sql
-- 通常のインデックス
CREATE INDEX idx_users_created_at ON users(created_at);

-- ユニークインデックス
CREATE UNIQUE INDEX uq_users_email ON users(email) WHERE deleted_at IS NULL;

-- 複合インデックス
CREATE INDEX idx_weekly_reports_user_id_start_date ON weekly_reports(user_id, start_date);
```

## PostgreSQL固有の機能

### UUID型の使用

IDカラムにはPostgreSQLのUUID型を使用し、デフォルト値として`gen_random_uuid()`を設定します：

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### TIMESTAMP型の使用

日時カラムにはTIMESTAMP型を使用します：

```sql
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### 論理削除を考慮したユニーク制約

論理削除を実装する場合、削除されていないレコードのみにユニーク制約を適用します：

```sql
CREATE UNIQUE INDEX uq_users_email_active ON users(email) WHERE deleted_at IS NULL;
```

### JSONB型の活用

構造化されたデータの保存にはJSONB型を使用できます：

```sql
metadata JSONB DEFAULT '{}'::jsonb
```

## 推奨される型

| 用途 | PostgreSQL型 | 説明 |
|-----|-------------|------|
| ID | UUID | 主キーに使用 |
| 名前、短い文字列 | VARCHAR(n) | 最大長が決まっている文字列 |
| 長い文字列 | TEXT | 最大長が決まっていない文字列 |
| 日時 | TIMESTAMP | タイムゾーンなし日時 |
| 日時（タイムゾーン付き） | TIMESTAMPTZ | タイムゾーン付き日時 |
| 日付のみ | DATE | 日付 |
| 真偽値 | BOOLEAN | true/false |
| 整数 | INTEGER | 一般的な整数 |
| 大きな整数 | BIGINT | 大きな整数 |
| 金額 | DECIMAL(10,2) | 精度が必要な数値 |
| JSON | JSONB | 構造化データ |

## マイグレーション実行時の注意事項

### トランザクション管理

- DDL操作はトランザクション内で実行可能ですが、一部の操作（CREATE INDEX CONCURRENTLY等）はトランザクション外で実行する必要があります
- 大量のデータ更新を伴う場合は、バッチ処理を検討します

### パフォーマンス考慮

- 本番環境での大きなテーブルへの変更は、`CONCURRENTLY`オプションを使用してロックを最小限に抑えます：

```sql
CREATE INDEX CONCURRENTLY idx_large_table_column ON large_table(column);
```

### データ移行

- スキーマ変更とデータ移行は別のマイグレーションファイルに分離することを推奨します
- データ移行は冪等性を確保し、再実行可能にします

## 更新履歴

- 2025-01-30: PostgreSQL版として新規作成（MySQLからの移行）