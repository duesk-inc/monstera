-- ユーザーのデフォルト勤務時間設定テーブル作成
CREATE TABLE IF NOT EXISTS user_default_work_settings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    -- 平日のデフォルト設定
    weekday_start_time VARCHAR(10) NOT NULL DEFAULT '09:00',
    weekday_end_time VARCHAR(10) NOT NULL DEFAULT '18:00',
    weekday_break_time DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    FOREIGN KEY (user_id) REFERENCES users(id)
);


-- Triggers for automatic timestamp updates

-- Trigger for user_default_work_settings table
CREATE OR REPLACE TRIGGER update_user_default_work_settings_updated_at
    BEFORE UPDATE ON user_default_work_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
