-- 週報テーブルのリファクタリングをロールバック

-- 1. トリガーと関数の削除
DROP TRIGGER IF EXISTS tr_weekly_reports_submission ON weekly_reports;
DROP FUNCTION IF EXISTS update_weekly_reports_submission();
DROP FUNCTION IF EXISTS fn_calculate_submission_deadline(DATE);

-- 2. 外部キー制約の削除
ALTER TABLE weekly_reports 
    DROP CONSTRAINT IF EXISTS fk_weekly_reports_department,
    DROP CONSTRAINT IF EXISTS fk_weekly_reports_manager;

-- 3. チェック制約の削除
ALTER TABLE weekly_reports 
    DROP CONSTRAINT IF EXISTS chk_weekly_reports_dates,
    DROP CONSTRAINT IF EXISTS chk_weekly_reports_work_hours,
    DROP CONSTRAINT IF EXISTS chk_weekly_reports_client_hours,
    DROP CONSTRAINT IF EXISTS chk_weekly_reports_mood,
    DROP CONSTRAINT IF EXISTS chk_weekly_reports_revision_count;

-- 4. インデックスの削除
DROP INDEX IF EXISTS idx_weekly_reports_department;
DROP INDEX IF EXISTS idx_weekly_reports_manager;
DROP INDEX IF EXISTS idx_weekly_reports_deadline;
DROP INDEX IF EXISTS idx_weekly_reports_late_submission;
DROP INDEX IF EXISTS idx_weekly_reports_last_accessed;

-- 5. 新しいカラムの削除
ALTER TABLE weekly_reports 
    DROP COLUMN IF EXISTS department_id,
    DROP COLUMN IF EXISTS department_name,
    DROP COLUMN IF EXISTS manager_id,
    DROP COLUMN IF EXISTS submission_deadline,
    DROP COLUMN IF EXISTS is_late_submission,
    DROP COLUMN IF EXISTS revision_count,
    DROP COLUMN IF EXISTS last_accessed_at,
    DROP COLUMN IF EXISTS metadata;