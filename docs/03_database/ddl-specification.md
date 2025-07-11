# SQLマイグレーションファイル実装仕様書

## 目的

本仕様書は、Monsteraプロジェクトにおけるデータベースマイグレーションファイルの実装ルールを定義します。これにより、一貫性のあるデータベーススキーマ管理を実現し、チーム全体での協調作業を円滑に進めることを目的としています。

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
2. 文字セットと照合順序を明示的に指定する
3. カラムにはコメントを追加する
4. 適切な外部キー制約を設定する
5. 必要なインデックスを作成する
6. 作成日時・更新日時・削除日時のカラムを設ける

### 例

```sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  username VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ユーザー名',
  email VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'メールアドレス',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
  deleted_at DATETIME(3) NULL COMMENT '削除日時',
  UNIQUE INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ユーザーテーブル';
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
CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
```

## インデックスの命名規則

インデックスは以下の命名パターンに従います：

```
idx_{テーブル名}_{カラム名}
```

複合インデックスの場合：

```
idx_{テーブル名}_{カラム1名}_{カラム2名}
```

### 例

```sql
INDEX idx_user_notification (user_id, notification_id)
```

## データ型の選択指針

| データの種類 | 推奨データ型 | 注意点 |
|------------|------------|-------|
| ID | VARCHAR(36) | UUID形式のIDに使用 |
| 短い文字列 | VARCHAR(n) | nは適切な長さを設定 |
| 長い文字列 | TEXT | 非常に長いテキストデータ用 |
| 日時 | DATETIME(3) | ミリ秒精度付き |
| 真偽値 | BOOLEAN | TINYINTの代わりに使用 |
| 列挙型 | ENUM | 有限の選択肢がある場合 |
| 数値 | INT, DECIMAL | 用途に応じて適切に選択 |
| ステータス | ENUM | 必ずENUM型を使用（可読性重視） |

## ステータスカラムの実装指針

### 基本原則
プロジェクトの保守性と開発者体験（DX）を最優先とし、ステータス管理は可読性を重視した文字列（ENUM型）を使用します。

### 新規テーブルの場合
```sql
-- 必ずENUM型で定義
status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft' NOT NULL COMMENT '申請ステータス（draft:下書き, submitted:提出済み, approved:承認済み, rejected:却下）'
```

### 既存テーブルの移行
既存のINT型やVARCHAR型のステータスカラムは、段階的にENUM型へ移行します：

```sql
-- Phase 1: INT型からENUM型への移行例
ALTER TABLE weekly_reports 
MODIFY COLUMN status ENUM('draft', 'submitted', 'approved', 'rejected') 
DEFAULT 'draft' NOT NULL 
COMMENT 'ステータス（draft:下書き, submitted:提出済み, approved:承認済み, rejected:却下）';

-- 移行時のデータ変換
UPDATE weekly_reports SET status = CASE
    WHEN status = '1' THEN 'draft'
    WHEN status = '2' THEN 'submitted'
    WHEN status = '3' THEN 'approved'
    WHEN status = '4' THEN 'rejected'
    ELSE 'draft'
END WHERE status IN ('1', '2', '3', '4');
```

### 注意事項
1. **値の定義**: 小文字の英単語で統一（例: 'active', 'pending', 'completed'）
2. **コメント**: 各値の意味を日本語でコメントに明記
3. **デフォルト値**: 適切なデフォルト値を設定
4. **NOT NULL**: 基本的にNOT NULL制約を設定

## マイグレーションの実行順序

1. マイグレーションファイルは連番の昇順で実行される
2. 各マイグレーションは一度だけ実行される
3. マイグレーションの実行状況はmigration_historiesテーブルで管理される

## マイグレーション作成時の注意点

1. 既存データに対する影響を十分に考慮する
2. 大量のデータを扱うテーブルの変更は、パフォーマンスへの影響を検討する
3. 重要なデータを操作する場合は、事前にバックアップを取得する
4. マイグレーションスクリプトは本番環境で実行する前に必ずテスト環境で検証する
5. 複雑な変更は複数のマイグレーションに分割することを検討する

## マイグレーション実行方法

Monsteraプロジェクトでは、golang-migrateを使用してマイグレーションを実行します。

```bash
# マイグレーションの適用
migrate -path ./backend/migrations -database "mysql://user:password@tcp(host:port)/database" up

# 特定バージョンまでマイグレーションを適用
migrate -path ./backend/migrations -database "mysql://user:password@tcp(host:port)/database" up N

# マイグレーションの巻き戻し
migrate -path ./backend/migrations -database "mysql://user:password@tcp(host:port)/database" down

# 特定バージョンまでマイグレーションを巻き戻し
migrate -path ./backend/migrations -database "mysql://user:password@tcp(host:port)/database" down N
```

## 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|-------|
| 2023-12-27 | 1.0.0 | 初版作成 | Admin | 