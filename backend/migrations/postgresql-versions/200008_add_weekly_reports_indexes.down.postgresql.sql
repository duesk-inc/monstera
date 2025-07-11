-- 週報テーブルのインデックス削除 DROP INDEX idx_weekly_reports_user_date ON weekly_reports;
DROP INDEX idx_weekly_reports_status_created ON weekly_reports;
DROP INDEX idx_weekly_reports_date_range ON weekly_reports;
DROP INDEX idx_weekly_reports_deleted_status ON weekly_reports;
DROP INDEX idx_weekly_reports_submitted_at ON weekly_reports;
DROP INDEX idx_weekly_reports_covering ON weekly_reports;
DROP INDEX idx_weekly_reports_unsubmitted ON weekly_reports;
DROP INDEX idx_weekly_reports_monthly ON weekly_reports;
-- フルテキストインデックス削除 ALTER TABLE weekly_reports DROP INDEX idx_weekly_reports_fulltext;
