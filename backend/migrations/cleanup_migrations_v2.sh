#!/bin/bash

# マイグレーション整理スクリプト v2
# ALTER文を使用しないマイグレーションへの統一

echo "=== マイグレーション整理開始 (v2) ==="

cd postgresql-versions

# 既存の統合版ファイルを新しいファイル名に移動
echo "1. 統合版ファイルのリネーム..."

# expenses
if [ -f "000010_create_expenses_table_v2.up.postgresql.sql" ]; then
    mv 000010_create_expenses_table_v2.up.postgresql.sql 000010_create_expenses_table.up.postgresql.sql
    mv 000010_create_expenses_table_v2.down.postgresql.sql 000010_create_expenses_table.down.postgresql.sql
    echo "  - expenses table統合版をリネーム"
fi

# clients
if [ -f "000017_create_clients_table_v2.up.postgresql.sql" ]; then
    mv 000017_create_clients_table_v2.up.postgresql.sql 000017_create_clients_table.up.postgresql.sql
    mv 000017_create_clients_table_v2.down.postgresql.sql 000017_create_clients_table.down.postgresql.sql
    echo "  - clients table統合版をリネーム"
fi

# invoices
if [ -f "000020_create_invoices_table_v2.up.postgresql.sql" ]; then
    mv 000020_create_invoices_table_v2.up.postgresql.sql 000020_create_invoices_table.up.postgresql.sql
    mv 000020_create_invoices_table_v2.down.postgresql.sql 000020_create_invoices_table.down.postgresql.sql
    echo "  - invoices table統合版をリネーム"
fi

# project_assignments
if [ -f "000019_create_project_assignments_table_v2.up.postgresql.sql" ]; then
    mv 000019_create_project_assignments_table_v2.up.postgresql.sql 000019_create_project_assignments_table.up.postgresql.sql
    mv 000019_create_project_assignments_table_v2.down.postgresql.sql 000019_create_project_assignments_table.down.postgresql.sql
    echo "  - project_assignments table統合版をリネーム"
fi

# weekly_reports
if [ -f "000003_create_reports_tables_v2.up.postgresql.sql" ]; then
    mv 000003_create_reports_tables_v2.up.postgresql.sql 000003_create_reports_tables.up.postgresql.sql
    mv 000003_create_reports_tables_v2.down.postgresql.sql 000003_create_reports_tables.down.postgresql.sql
    echo "  - weekly_reports table統合版をリネーム"
fi

# 残りのALTER文を含むマイグレーションをdisabledに移動
echo "2. 残りのALTER文マイグレーションを無効化..."

# disabledディレクトリがなければ作成
mkdir -p disabled

# weekly_reports関連
if [ -f "200010_refactor_weekly_reports_model.up.postgresql.sql" ]; then
    mv 200010_refactor_weekly_reports_model.up.postgresql.sql disabled/
    mv 200010_refactor_weekly_reports_model.down.postgresql.sql disabled/
    echo "  - 200010_refactor_weekly_reports_modelを無効化"
fi

echo "3. マイグレーション整理サマリー更新..."

cat > ../MIGRATION_SUMMARY_V2.md << 'EOF'
# マイグレーション整理サマリー V2

## 完了した作業

### 統合版マイグレーションの作成完了

1. **usersテーブル（000001）**
   - 200004_add_department_to_users
   - 200012_extend_users_for_engineers  
   - 200060_add_name_column_to_users

2. **expensesテーブル（000010）**
   - 200047_add_expense_deadline_fields
   - 200071_add_version_to_expenses

3. **clientsテーブル（000017）**
   - 200028_add_sales_columns_to_clients
   - 200033_extend_clients_for_accounting

4. **invoicesテーブル（000020）**
   - 200034_extend_invoices_for_accounting

5. **project_assignmentsテーブル（000019）**
   - 200035_extend_project_assignments_for_billing

6. **weekly_reportsテーブル（000003）**
   - 200010_refactor_weekly_reports_model

### 実行手順

1. データベースバックアップ（必須）
2. マイグレーションのリセット
   ```bash
   docker-compose exec backend migrate -path migrations/postgresql-versions -database "postgres://..." force 0
   ```
3. 新しいマイグレーションの実行
   ```bash
   docker-compose exec backend migrate -path migrations/postgresql-versions -database "postgres://..." up
   ```

## 注意事項
- 全てのALTER文ベースのマイグレーションが統合されました
- 本番環境での実行前に必ずバックアップを取得してください
- schema_migrationsテーブルのリセットが必要です
EOF

echo "=== マイグレーション整理完了 ==="
echo "次のステップ:"
echo "1. git status でファイルの変更を確認"
echo "2. マイグレーションをリセットして再実行"