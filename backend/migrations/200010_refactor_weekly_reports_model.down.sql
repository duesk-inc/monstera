-- 週報テーブルのリファクタリングをロールバック

-- 1. トリガーと関数の削除
DROP TRIGGER IF EXISTS tr_weekly_reports_submission;
DROP FUNCTION IF EXISTS fn_calculate_submission_deadline;

-- 2. 外部キー制約の削除
ALTER TABLE weekly_reports 
DROP FOREIGN KEY fk_weekly_reports_department,
DROP FOREIGN KEY fk_weekly_reports_manager;

-- 3. チェック制約の削除
ALTER TABLE weekly_reports 
DROP CHECK chk_weekly_reports_dates,
DROP CHECK chk_weekly_reports_work_hours,
DROP CHECK chk_weekly_reports_client_hours,
DROP CHECK chk_weekly_reports_mood,
DROP CHECK chk_weekly_reports_revision_count;

-- 4. インデックスの削除
ALTER TABLE weekly_reports 
DROP INDEX idx_weekly_reports_department,
DROP INDEX idx_weekly_reports_manager,
DROP INDEX idx_weekly_reports_deadline,
DROP INDEX idx_weekly_reports_late_submission,
DROP INDEX idx_weekly_reports_last_accessed;

-- 5. 新しいカラムの削除
ALTER TABLE weekly_reports 
DROP COLUMN department_id,
DROP COLUMN department_name,
DROP COLUMN manager_id,
DROP COLUMN submission_deadline,
DROP COLUMN is_late_submission,
DROP COLUMN revision_count,
DROP COLUMN last_accessed_at,
DROP COLUMN metadata;