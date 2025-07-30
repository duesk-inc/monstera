-- Drop foreign key constraints
ALTER TABLE weekly_reports DROP CONSTRAINT IF EXISTS fk_weekly_reports_department;

-- Drop triggers
DROP TRIGGER IF EXISTS tr_weekly_reports_submission ON weekly_reports;
DROP TRIGGER IF EXISTS update_weekly_reports_updated_at ON weekly_reports;
DROP TRIGGER IF EXISTS update_daily_records_updated_at ON daily_records;

-- Drop functions
DROP FUNCTION IF EXISTS update_weekly_reports_submission();
DROP FUNCTION IF EXISTS fn_calculate_submission_deadline(DATE);

-- Drop tables
DROP TABLE IF EXISTS daily_records;
DROP TABLE IF EXISTS weekly_reports;