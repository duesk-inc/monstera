#!/bin/bash

# マイグレーション整理スクリプト
# ALTERを使わない統合版マイグレーションへの移行

set -e

echo "=== マイグレーション整理スクリプト ==="
echo ""

# 作業ディレクトリの確認
MIGRATION_DIR="/Users/daichirouesaka/Documents/90_duesk/monstera/backend/migrations"
cd "$MIGRATION_DIR"

# バックアップディレクトリの作成
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "1. 既存ファイルのバックアップ..."
# PostgreSQL版のバックアップ
cp -r postgresql-versions "$BACKUP_DIR/"
echo "   バックアップ完了: $BACKUP_DIR"

echo ""
echo "2. 不要なALTERマイグレーションの無効化..."

# usersテーブル関連（既に.skip済み）
echo "   - users関連: 既に処理済み"

# expensesテーブル関連
if [ -f "postgresql-versions/200047_add_expense_deadline_fields.up.postgresql.sql" ]; then
    mv "postgresql-versions/200047_add_expense_deadline_fields.up.postgresql.sql" \
       "postgresql-versions/200047_add_expense_deadline_fields.up.postgresql.sql.skip"
    echo "   - 200047_add_expense_deadline_fields: 無効化"
fi

if [ -f "postgresql-versions/200071_add_version_to_expenses.up.postgresql.sql" ]; then
    mv "postgresql-versions/200071_add_version_to_expenses.up.postgresql.sql" \
       "postgresql-versions/200071_add_version_to_expenses.up.postgresql.sql.skip"
    echo "   - 200071_add_version_to_expenses: 無効化"
fi

# clientsテーブル関連
if [ -f "postgresql-versions/200028_add_sales_columns_to_clients.up.postgresql.sql" ]; then
    mv "postgresql-versions/200028_add_sales_columns_to_clients.up.postgresql.sql" \
       "postgresql-versions/200028_add_sales_columns_to_clients.up.postgresql.sql.skip"
    echo "   - 200028_add_sales_columns_to_clients: 無効化"
fi

if [ -f "postgresql-versions/200033_extend_clients_for_accounting.up.postgresql.sql" ]; then
    mv "postgresql-versions/200033_extend_clients_for_accounting.up.postgresql.sql" \
       "postgresql-versions/200033_extend_clients_for_accounting.up.postgresql.sql.skip"
    echo "   - 200033_extend_clients_for_accounting: 無効化"
fi

# invoicesテーブル関連
if [ -f "postgresql-versions/200034_extend_invoices_for_accounting.up.postgresql.sql" ]; then
    mv "postgresql-versions/200034_extend_invoices_for_accounting.up.postgresql.sql" \
       "postgresql-versions/200034_extend_invoices_for_accounting.up.postgresql.sql.skip"
    echo "   - 200034_extend_invoices_for_accounting: 無効化"
fi

# project_assignmentsテーブル関連
if [ -f "postgresql-versions/200035_extend_project_assignments_for_billing.up.postgresql.sql" ]; then
    mv "postgresql-versions/200035_extend_project_assignments_for_billing.up.postgresql.sql" \
       "postgresql-versions/200035_extend_project_assignments_for_billing.up.postgresql.sql.skip"
    echo "   - 200035_extend_project_assignments_for_billing: 無効化"
fi

echo ""
echo "3. 統合版マイグレーションファイルの配置..."

# 旧バージョンを無効化
if [ -f "postgresql-versions/000010_create_expenses_table.up.postgresql.sql" ]; then
    mv "postgresql-versions/000010_create_expenses_table.up.postgresql.sql" \
       "postgresql-versions/000010_create_expenses_table.up.postgresql.sql.old"
    echo "   - 000010_create_expenses_table: 旧版を保存"
fi

if [ -f "postgresql-versions/000017_create_clients_table.up.postgresql.sql" ]; then
    mv "postgresql-versions/000017_create_clients_table.up.postgresql.sql" \
       "postgresql-versions/000017_create_clients_table.up.postgresql.sql.old"
    echo "   - 000017_create_clients_table: 旧版を保存"
fi

# 新バージョンをリネーム
if [ -f "postgresql-versions/000010_create_expenses_table_v2.up.postgresql.sql" ]; then
    mv "postgresql-versions/000010_create_expenses_table_v2.up.postgresql.sql" \
       "postgresql-versions/000010_create_expenses_table.up.postgresql.sql"
    mv "postgresql-versions/000010_create_expenses_table_v2.down.postgresql.sql" \
       "postgresql-versions/000010_create_expenses_table.down.postgresql.sql"
    echo "   - expenses統合版: 配置完了"
fi

if [ -f "postgresql-versions/000017_create_clients_table_v2.up.postgresql.sql" ]; then
    mv "postgresql-versions/000017_create_clients_table_v2.up.postgresql.sql" \
       "postgresql-versions/000017_create_clients_table.up.postgresql.sql"
    mv "postgresql-versions/000017_create_clients_table_v2.down.postgresql.sql" \
       "postgresql-versions/000017_create_clients_table.down.postgresql.sql"
    echo "   - clients統合版: 配置完了"
fi

echo ""
echo "4. 完了レポート生成..."

cat > "MIGRATION_CLEANUP_REPORT_$(date +%Y%m%d_%H%M%S).md" << EOF
# マイグレーション整理レポート

実行日時: $(date +"%Y-%m-%d %H:%M:%S")

## 処理内容

### 1. 無効化したALTERマイグレーション
- 200047_add_expense_deadline_fields
- 200071_add_version_to_expenses
- 200028_add_sales_columns_to_clients
- 200033_extend_clients_for_accounting
- 200034_extend_invoices_for_accounting
- 200035_extend_project_assignments_for_billing

### 2. 統合版に置き換えたテーブル
- expenses（000010）
- clients（000017）

### 3. バックアップ
- 場所: $BACKUP_DIR

## 次のステップ
1. データベースのマイグレーション状態をリセット
2. 統合版マイグレーションの実行
3. 動作確認

## 注意事項
- 本番環境では必ずデータベースのバックアップを取得してから実行
- schema_migrationsテーブルのクリーンアップが必要
EOF

echo ""
echo "=== 整理完了 ==="
echo "レポート: MIGRATION_CLEANUP_REPORT_$(date +%Y%m%d_%H%M%S).md"
echo ""
echo "次のコマンドでマイグレーションをリセットできます:"
echo "  docker-compose exec backend migrate -path migrations/postgresql-versions -database \"postgres://...\" force 0"
echo "  docker-compose exec backend migrate -path migrations/postgresql-versions -database \"postgres://...\" up"