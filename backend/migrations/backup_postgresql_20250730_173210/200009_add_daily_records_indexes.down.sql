-- 日次記録テーブルのインデックス削除
DROP INDEX idx_daily_records_weekly_report ON daily_records;
DROP INDEX idx_daily_records_date ON daily_records;
DROP INDEX idx_daily_records_holiday_work ON daily_records;
DROP INDEX idx_daily_records_work_hours ON daily_records;
DROP INDEX idx_daily_records_client_work ON daily_records;
DROP INDEX idx_daily_records_monthly_aggregate ON daily_records;
DROP INDEX idx_daily_records_covering ON daily_records;