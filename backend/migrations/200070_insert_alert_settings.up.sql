-- alert_settingsテーブルに初期データを投入
-- システム全体で1レコードのみ保持する設計のため、既存レコードがある場合は何もしない
INSERT INTO alert_settings (
    id,
    weekly_hours_limit,
    weekly_hours_change_limit,
    consecutive_holiday_work_limit,
    monthly_overtime_limit,
    updated_by,
    updated_at,
    created_at
)
SELECT 
    gen_random_uuid()::text,
    60, -- 週60時間
    20, -- 前週比20時間
    3,  -- 3週連続
    80, -- 月80時間
    id,
    CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo',
    CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'
FROM users 
WHERE email = 'admin@duesk.co.jp' 
LIMIT 1
ON CONFLICT DO NOTHING;