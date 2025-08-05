-- 週報関連テーブルの削除

-- トリガーの削除
DROP TRIGGER IF EXISTS update_weekly_report_templates_updated_at ON weekly_report_templates;
DROP TRIGGER IF EXISTS update_weekly_report_comments_updated_at ON weekly_report_comments;
DROP TRIGGER IF EXISTS update_weekly_reports_updated_at ON weekly_reports;

-- インデックスの削除
-- weekly_report_templates
DROP INDEX IF EXISTS idx_weekly_report_templates_user_id;

-- weekly_reports_archive
DROP INDEX IF EXISTS idx_weekly_reports_archive_archived_at;
DROP INDEX IF EXISTS idx_weekly_reports_archive_year_week;
DROP INDEX IF EXISTS idx_weekly_reports_archive_user_id;

-- weekly_report_comments
DROP INDEX IF EXISTS idx_weekly_report_comments_created_at;
DROP INDEX IF EXISTS idx_weekly_report_comments_commented_by;
DROP INDEX IF EXISTS idx_weekly_report_comments_report_id;

-- weekly_reports
DROP INDEX IF EXISTS idx_weekly_reports_deleted_at;
DROP INDEX IF EXISTS idx_weekly_reports_submitted_at;
DROP INDEX IF EXISTS idx_weekly_reports_manager_id;
DROP INDEX IF EXISTS idx_weekly_reports_status;
DROP INDEX IF EXISTS idx_weekly_reports_year_week;
DROP INDEX IF EXISTS idx_weekly_reports_user_id;

-- テーブルの削除（依存関係の順序で削除）
DROP TABLE IF EXISTS weekly_report_templates CASCADE;
DROP TABLE IF EXISTS weekly_reports_archive CASCADE;
DROP TABLE IF EXISTS weekly_report_comments CASCADE;
DROP TABLE IF EXISTS weekly_reports CASCADE;