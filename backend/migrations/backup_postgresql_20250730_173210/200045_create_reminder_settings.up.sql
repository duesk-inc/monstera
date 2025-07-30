-- 自動リマインド設定テーブル
CREATE TABLE IF NOT EXISTS reminder_settings (
    id VARCHAR(36) PRIMARY KEY,
    enabled BOOLEAN DEFAULT TRUE,
    first_reminder_days INT DEFAULT 3 COMMENT '初回リマインド日数',
    second_reminder_days INT DEFAULT 7 COMMENT '2回目リマインド日数',
    escalation_days INT DEFAULT 14 COMMENT 'エスカレーション日数',
    reminder_time VARCHAR(5) DEFAULT '09:00' COMMENT 'リマインド送信時刻（HH:MM）',
    include_manager BOOLEAN DEFAULT TRUE COMMENT 'マネージャーをCCに含める',
    updated_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_deleted_at (deleted_at),
    CONSTRAINT fk_reminder_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) VALUES (
    UUID(),
    TRUE,
    3,
    7,
    14,
    '09:00',
    TRUE,
    (SELECT id FROM users WHERE email = 'admin@duesk.co.jp' LIMIT 1)
);