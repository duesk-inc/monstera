# マイグレーション整理計画

## 目的
ALTER文を使用しない方針でマイグレーションファイルを統一し、PostgreSQL専用の構成に整理する。

## 現状分析

### ディレクトリ構造
```
migrations/
├── *.sql                    # MySQL用（旧）
├── postgresql-versions/     # PostgreSQL用（現行）
├── postgresql-conversions/  # 変換作業用
└── postgresql-configs/      # 設定関連
```

### 問題点
1. ALTER文を使用しているファイルが83個存在
2. MySQL用とPostgreSQL用のファイルが混在
3. .skipファイルで一部のALTER文を無効化している
4. 番号の重複やdirty状態が発生

## 整理方針

### 1. ALTER文の排除
- ALTER TABLEでカラムを追加する代わりに、CREATE TABLEで全カラムを定義
- 既存テーブルの変更が必要な場合は、以下の手順：
  1. 新しいテーブルを作成
  2. データを移行
  3. 古いテーブルを削除
  4. 新しいテーブルをリネーム

### 2. ファイル構成
```
postgresql-versions/
├── 000000_create_timestamp_trigger_function.up.postgresql.sql  # 共通関数
├── 000001_create_users_table.up.postgresql.sql               # 全カラム統合版
├── 000002_create_profiles_and_related_tables.up.postgresql.sql
└── ...（以降、CREATE文のみ）
```

### 3. 統合対象（usersテーブルの例）
以下のALTER文を000001_create_users_table.up.postgresql.sqlに統合済み：
- 200004_add_department_to_users → department_id, manager_id
- 200012_extend_users_for_engineers → sei, mei, employee_number等
- 200060_add_name_column_to_users → name, cognito_sub, status

### 4. 作業手順
1. 既存マイグレーションのバックアップ
2. ALTER文を含むファイルの分析
3. CREATE TABLEへの統合
4. 不要なファイルの削除
5. マイグレーション番号の整理

### 5. 命名規則
- PostgreSQL専用ファイル: `*.up.postgresql.sql`
- 番号は6桁（000001〜）
- seed系は100000番台
- 設定系は200000番台（ただしCREATE文として実装）

## 対応が必要な主要ファイル

### expenses関連
- 200047_add_expense_deadline_fields → expenses テーブルに統合
- 200065_add_expense_count_to_summaries → expense_summaries テーブルに統合
- 200071_add_version_to_expenses → expenses テーブルに統合

### その他のテーブル
- 200028_add_sales_columns_to_clients → clients テーブルに統合
- 200033_extend_clients_for_accounting → clients テーブルに統合
- 200034_extend_invoices_for_accounting → invoices テーブルに統合
- 200035_extend_project_assignments_for_billing → project_assignments テーブルに統合

## 実装サンプル

### ALTER文を使わない変更例
```sql
-- 悪い例（ALTER文）
ALTER TABLE expenses ADD COLUMN version INT DEFAULT 1;

-- 良い例（再作成）
-- Step 1: 新テーブル作成
CREATE TABLE expenses_new AS SELECT * FROM expenses;
ALTER TABLE expenses_new ADD COLUMN version INT DEFAULT 1;

-- Step 2: データ移行
INSERT INTO expenses_new SELECT *, 1 as version FROM expenses;

-- Step 3: テーブル入れ替え
DROP TABLE expenses;
ALTER TABLE expenses_new RENAME TO expenses;

-- または最初から全カラムを含むCREATE文を作成
CREATE TABLE expenses (
    id VARCHAR(36) PRIMARY KEY,
    -- ... 既存カラム ...
    version INT DEFAULT 1  -- 新規カラム
);
```

## 注意事項
1. 本番環境での実行前に必ずバックアップを取得
2. 依存関係（外部キー等）の順序に注意
3. データ移行スクリプトは別途作成
4. マイグレーション履歴（schema_migrations）のクリーンアップが必要