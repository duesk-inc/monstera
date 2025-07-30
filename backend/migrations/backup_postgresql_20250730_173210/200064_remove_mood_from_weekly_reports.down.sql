-- Restore mood column to weekly_reports table
ALTER TABLE weekly_reports ADD COLUMN mood INT NOT NULL DEFAULT 3 AFTER status;

-- Restore mood column to weekly_reports_archive table
ALTER TABLE weekly_reports_archive ADD COLUMN mood TINYINT NOT NULL DEFAULT 1 CHECK (mood BETWEEN 1 AND 5) AFTER status;