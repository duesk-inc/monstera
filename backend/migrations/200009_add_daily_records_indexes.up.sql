-- 日次記録テーブルのインデックス最適化
-- P0-T3のデータベース最適化計画書に基づく

-- 1. 週報IDでの検索高速化（最頻出）
CREATE INDEX idx_daily_records_weekly_report ON daily_records(weekly_report_id);

-- 2. 日付での集計用
CREATE INDEX idx_daily_records_date ON daily_records(date);

-- 3. 休日勤務の抽出用
CREATE INDEX idx_daily_records_holiday_work ON daily_records(is_holiday_work, date);

-- 4. 稼働時間での検索（0時間除外等）
CREATE INDEX idx_daily_records_work_hours ON daily_records(work_hours);

-- 5. 顧客先稼働の抽出
CREATE INDEX idx_daily_records_client_work ON daily_records(has_client_work, client_work_hours);

-- 6. 月次集計用の複合インデックス
CREATE INDEX idx_daily_records_monthly_aggregate ON daily_records(
    YEAR(date), MONTH(date), work_hours, client_work_hours
);

-- 7. カバリングインデックス（集計クエリ用）
CREATE INDEX idx_daily_records_covering ON daily_records(
    weekly_report_id, date, work_hours, client_work_hours, is_holiday_work
);