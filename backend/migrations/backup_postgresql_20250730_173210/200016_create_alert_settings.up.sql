-- アラート設定テーブル
CREATE TABLE IF NOT EXISTS `alert_settings` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    `name` VARCHAR(100) NOT NULL COMMENT '設定名',
    `description` VARCHAR(500) COMMENT '設定の説明',
    `alert_type` ENUM('overwork', 'work_hours_change', 'consecutive_holiday_work', 'monthly_overtime', 'unsubmitted') NOT NULL COMMENT 'アラートタイプ',
    `condition_operator` ENUM('gt', 'gte', 'lt', 'lte', 'eq', 'ne') NOT NULL DEFAULT 'gt' COMMENT '条件演算子',
    `condition_value` DECIMAL(10,2) NOT NULL COMMENT '閾値',
    `condition_unit` VARCHAR(20) NOT NULL DEFAULT 'hours' COMMENT '単位（hours, days, count等）',
    `severity` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium' COMMENT '重要度',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '有効フラグ',
    `notification_channels` JSON COMMENT '通知チャネル設定',
    `target_departments` JSON COMMENT '対象部署ID配列',
    `target_roles` JSON COMMENT '対象ロール配列',
    `created_by` VARCHAR(36) NOT NULL COMMENT '作成者ID',
    `updated_by` VARCHAR(36) COMMENT '更新者ID',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    
    KEY `idx_alert_settings_type` (`alert_type`),
    KEY `idx_alert_settings_active` (`is_active`),
    KEY `idx_alert_settings_severity` (`severity`),
    KEY `idx_alert_settings_deleted` (`deleted_at`),
    CONSTRAINT `fk_alert_settings_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
    CONSTRAINT `fk_alert_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='アラート設定テーブル';

-- デフォルトアラート設定の挿入
INSERT INTO `alert_settings` (`name`, `description`, `alert_type`, `condition_operator`, `condition_value`, `condition_unit`, `severity`, `created_by`) VALUES
('週間労働時間上限', '週の労働時間が60時間を超えた場合にアラート', 'overwork', 'gt', 60.00, 'hours', 'high', (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
('労働時間急増', '前週比で20時間以上増加した場合にアラート', 'work_hours_change', 'gt', 20.00, 'hours', 'medium', (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
('連続休日出勤', '3週連続で休日出勤した場合にアラート', 'consecutive_holiday_work', 'gte', 3.00, 'count', 'high', (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
('月間残業時間', '月の残業時間が45時間を超えた場合にアラート', 'monthly_overtime', 'gt', 45.00, 'hours', 'medium', (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
('週報未提出', '提出期限から7日経過した場合にアラート', 'unsubmitted', 'gt', 7.00, 'days', 'medium', (SELECT id FROM users WHERE role = 'admin' LIMIT 1));