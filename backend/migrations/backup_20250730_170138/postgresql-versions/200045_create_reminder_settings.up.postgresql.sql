-- 自動リマインド設定テーブル
CREATE TABLE IF NOT EXISTS reminder_settings (
    id VARCHAR(36) PRIMARY KEY,
    enabled BOOLEAN DEFAULT TRUE,
    first_reminder_days INT DEFAULT 3, -- 初回リマインド日数
    second_reminder_days INT DEFAULT 7, -- 2回目リマインド日数
    escalation_days INT DEFAULT 14, -- エスカレーション日数
    reminder_time VARCHAR(5) DEFAULT '09:00', -- リマインド送信時刻（HH:MM）
    include_manager BOOLEAN DEFAULT TRUE, -- マネージャーをCCに含める
    updated_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_reminder_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_deleted_at ON reminder_settings(deleted_at);

-- コメントの追加
COMMENT ON COLUMN reminder_settings.first_reminder_days IS '初回リマインド日数';
COMMENT ON COLUMN reminder_settings.second_reminder_days IS '2回目リマインド日数';
COMMENT ON COLUMN reminder_settings.escalation_days IS 'エスカレーション日数';
COMMENT ON COLUMN reminder_settings.reminder_time IS 'リマインド送信時刻（HH:MM）';
COMMENT ON COLUMN reminder_settings.include_manager IS 'マネージャーをCCに含める';

-- デフォルト設定を挿入
INSERT INTO reminder_settings (
    id,
    enabled,
    first_reminder_days,
    second_reminder_days,
    escalation_days,
    reminder_time,
    include_manager,
    updated_by
)
SELECT
    gen_random_uuid()::text,
    TRUE,
    3,
    7,
    14,
    '09:00',
    TRUE,
    id
FROM users
WHERE role = 2  -- admin role
ORDER BY created_at
LIMIT 1
ON CONFLICT DO NOTHING;


-- Triggers for automatic timestamp updates

-- Trigger for reminder_settings table
DROP TRIGGER IF EXISTS update_reminder_settings_updated_at ON reminder_settings;
CREATE TRIGGER update_reminder_settings_updated_at
    BEFORE UPDATE ON reminder_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();