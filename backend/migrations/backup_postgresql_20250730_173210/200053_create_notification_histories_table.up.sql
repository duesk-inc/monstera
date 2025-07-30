-- 通知履歴テーブルの作成（パフォーマンス最適化版）
CREATE TABLE IF NOT EXISTS notification_histories (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY DEFAULT (UUID()),
    recipient_id VARCHAR(36) NOT NULL COMMENT '受信者ID',
    sender_id VARCHAR(36) NOT NULL COMMENT '送信者ID',
    notification_type VARCHAR(50) NOT NULL COMMENT '通知種別（weekly_report_reminder, alert_notification等）',
    title VARCHAR(200) NOT NULL COMMENT '通知タイトル',
    message TEXT NOT NULL COMMENT '通知メッセージ',
    is_read BOOLEAN NOT NULL DEFAULT FALSE COMMENT '既読フラグ',
    read_at TIMESTAMP NULL COMMENT '既読日時',
    related_entity_type VARCHAR(50) COMMENT '関連エンティティタイプ（weekly_report, alert等）',
    related_entity_id VARCHAR(36) COMMENT '関連エンティティID',
    metadata JSON COMMENT 'メタデータ（送信方法、優先度等）',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- パフォーマンス最適化のためのインデックス
    INDEX idx_notification_histories_recipient_read (recipient_id, is_read),
    INDEX idx_notification_histories_type_created (notification_type, created_at),
    INDEX idx_notification_histories_created_at (created_at),
    INDEX idx_notification_histories_related_entity (related_entity_type, related_entity_id),
    INDEX idx_notification_histories_sender (sender_id),
    
    -- 外部キー制約
    CONSTRAINT fk_notification_histories_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_histories_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通知履歴テーブル';

-- 通知タイプのENUM値を定義するためのチェック制約（MySQL 8.0.16以降）
ALTER TABLE notification_histories 
ADD CONSTRAINT chk_notification_type CHECK (
    notification_type IN (
        'weekly_report_reminder',
        'weekly_report_comment',
        'alert_notification',
        'system_maintenance',
        'general_announcement'
    )
);

-- 関連エンティティタイプのチェック制約
ALTER TABLE notification_histories 
ADD CONSTRAINT chk_related_entity_type CHECK (
    related_entity_type IS NULL OR related_entity_type IN (
        'weekly_report',
        'alert',
        'user',
        'department'
    )
);