#!/bin/bash

# PostgreSQL版マイグレーションファイルを整理するスクリプト

echo "=== PostgreSQL版マイグレーションファイルの整理開始 ==="

# 作業ディレクトリの確認
cd /Users/daichirouesaka/Documents/90_duesk/monstera/backend/migrations

# バックアップディレクトリ作成
BACKUP_DIR="backup_postgresql_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 1. 既存の.sqlファイルをバックアップ
echo "1. 既存の.sqlファイルをバックアップ..."
find . -maxdepth 1 -name "*.sql" -type f -exec mv {} "$BACKUP_DIR/" \;

# 2. PostgreSQL版のマイグレーションファイルを移動
echo "2. PostgreSQL版のマイグレーションファイルを移動..."

# 基本的なテーブル作成マイグレーション（000000-000030）
for file in postgresql-versions/0000*.postgresql.sql \
            postgresql-versions/0001*.postgresql.sql \
            postgresql-versions/0002*.postgresql.sql \
            postgresql-versions/0003*.postgresql.sql; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .postgresql.sql)
        cp "$file" "./${filename}.sql"
        echo "  - ${filename}.sql"
    fi
done

# シードデータ（100000-100001）
for file in postgresql-versions/1000*.postgresql.sql; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .postgresql.sql)
        cp "$file" "./${filename}.sql"
        echo "  - ${filename}.sql"
    fi
done

# 追加テーブルと機能（200000-200071）
for file in postgresql-versions/2000*.postgresql.sql; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .postgresql.sql)
        cp "$file" "./${filename}.sql"
        echo "  - ${filename}.sql"
    fi
done

# 3. 不要なファイルの除外
echo "3. 不要なファイルを除外..."

# レポートファイルとチェックファイルは移動しない
rm -f ./*_REPORT.sql
rm -f ./check_*.sql
rm -f ./zero_date_migration_tool.sql

# disabledディレクトリのファイルは移動しない
rm -f ./*skip.sql

# 4. 結果確認
echo "4. 移動結果の確認..."
echo "  - 移動されたファイル数: $(ls -1 *.sql 2>/dev/null | wc -l)"

# 5. マイグレーションリストの作成
echo "5. マイグレーションリストの作成..."
cat > POSTGRESQL_MIGRATION_LIST.md << 'EOF'
# PostgreSQL マイグレーションファイル一覧

## 基本テーブル作成（000000-000030）
- 000000_create_timestamp_trigger_function - タイムスタンプ更新用トリガー関数
- 000001_create_users_table - ユーザーテーブル（統合版）
- 000002_create_profiles_and_related_tables - プロフィール関連テーブル
- 000003_create_reports_tables - 週報テーブル（統合版）
- 000004_create_user_default_work_settings_table - デフォルト勤務設定
- 000005_create_leave_master_tables - 休暇マスタ
- 000006_create_leave_balance_tables - 休暇残高
- 000007_create_leave_request_tables - 休暇申請
- 000008_create_attendances_table - 勤怠
- 000009_migrate_roles_to_numeric - ロール数値化
- 000010_create_expenses_table - 経費申請（統合版）
- 000011_fix_leave_request_boolean_default - 休暇申請修正
- 000012_create_notifications_tables - 通知
- 000013_create_sessions_table - セッション
- 000014_create_profile_skills_and_certifications_tables - スキル・資格
- 000015_create_profile_owned_certifications_table - 保有資格
- 000016_create_role_permissions_table - ロール権限
- 000017_create_clients_table - 取引先（統合版）
- 000018_create_projects_table - プロジェクト
- 000019_create_project_assignments_table - プロジェクトアサイン（統合版）
- 000020_create_invoices_table - 請求書（統合版）
- 000021_create_sales_activities_table - 営業活動
- 000022_create_invoice_details_table - 請求明細
- 000023_create_technology_master - 技術マスタ
- 000024_extend_work_histories_table - 職歴拡張
- 000025_create_user_skill_summary_view - スキルサマリビュー
- 000026_create_user_it_experience_view - IT経験ビュー
- 000027_create_departments_table - 部署
- 000028_fix_unique_constraints_for_postgresql - ユニーク制約修正
- 000030_create_expense_drafts_table - 経費下書き

## シードデータ（100000-100001）
- 100000_seed_initial_data - 初期データ
- 100001_seed_technology_master - 技術マスタデータ

## 追加機能（200000-200071）
- 200000_seed_notification_data - 通知データ
- 200001_create_user_roles_table - ユーザーロールテーブル
- 200003_add_deferrable_constraints - 遅延制約追加
- 200005_add_scope_to_expense_limits - 経費上限スコープ
- 200006_configure_wal_settings - WAL設定
- 200007_configure_slow_query_logging - スロークエリログ設定
- 200008_add_weekly_reports_indexes - 週報インデックス
- 200009_add_daily_records_indexes - 日次記録インデックス
- 200011_create_alert_tables - アラートテーブル
- 200016_create_alert_settings - アラート設定
- 200017_create_alert_histories - アラート履歴
- 200018_create_audit_logs_table - 監査ログ
- 200019_create_change_histories_table - 変更履歴
- 200020_add_performance_indexes - パフォーマンスインデックス
- 200023_create_contract_extensions_table - 契約延長
- 200029_add_sales_roles - 営業ロール
- 200030_create_project_groups_table - プロジェクトグループ
- 200031_create_project_group_mappings_table - プロジェクトグループマッピング
- 200032_create_freee_sync_logs_table - freee同期ログ
- 200036_create_invoice_audit_logs_table - 請求書監査ログ
- 200037_create_scheduled_jobs_table - スケジュールジョブ
- 200038_add_accounting_performance_indexes - 経理パフォーマンスインデックス
- 200039_add_expense_tables - 経費関連テーブル
- 200040_create_proposals_table - 提案テーブル
- 200041_create_proposal_questions_table - 提案質問テーブル
- 200042_add_accounting_permissions - 経理権限
- 200043_seed_expense_limits - 経費上限シード
- 200044_create_expense_approver_settings - 経費承認者設定
- 200045_create_reminder_settings - リマインダー設定
- 200046_create_expense_receipts_table - 経費領収書
- 200050_create_export_jobs_table - エクスポートジョブ
- 200051_create_weekly_reports_archive_table - 週報アーカイブ
- 200052_create_archive_procedures - アーカイブプロシージャ
- 200053_create_notification_histories_table - 通知履歴
- 200055_add_proposal_performance_indexes - 提案パフォーマンスインデックス
- 200056_create_reminder_histories_table - リマインダー履歴
- 200057_add_recommended_leave_periods - 推奨休暇期間
- 200059_create_reminder_recipients_table - リマインダー受信者
- 200061_add_cognito_local_users - Cognito Localユーザー
- 200070_insert_alert_settings - アラート設定挿入

## 統合済みALTER文（disabledディレクトリに移動）
- 200004_add_department_to_users → 000001に統合
- 200010_refactor_weekly_reports_model → 000003に統合
- 200012_extend_users_for_engineers → 000001に統合
- 200028_add_sales_columns_to_clients → 000017に統合
- 200033_extend_clients_for_accounting → 000017に統合
- 200034_extend_invoices_for_accounting → 000020に統合
- 200035_extend_project_assignments_for_billing → 000019に統合
- 200047_add_expense_deadline_fields → 000010に統合
- 200060_add_name_column_to_users → 000001に統合
- 200071_add_version_to_expenses → 000010に統合
EOF

echo "=== PostgreSQL版マイグレーションファイルの整理完了 ==="
echo ""
echo "次のステップ:"
echo "1. POSTGRESQL_MIGRATION_LIST.md でマイグレーション一覧を確認"
echo "2. マイグレーションをリセットして再実行"
echo "   docker-compose exec backend migrate -path migrations -database \"postgres://...\" force 0"
echo "   docker-compose exec backend migrate -path migrations -database \"postgres://...\" up"