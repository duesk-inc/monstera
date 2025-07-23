-- Remove mood column from weekly_reports table
ALTER TABLE weekly_reports DROP COLUMN mood;

-- Remove mood column from weekly_reports_archive table
ALTER TABLE weekly_reports_archive DROP COLUMN mood;