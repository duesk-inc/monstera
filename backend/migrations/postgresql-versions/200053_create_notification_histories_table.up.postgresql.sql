-- 通知履歴テーブルの作成（パフォーマンス最適化版）
CREATE TABLE IF NOT EXISTS notification_histories (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    recipient_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    related_entity_type VARCHAR(50),
    related_entity_id VARCHAR(36),
    metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_notification_histories_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_histories_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments on notification_histories columns
COMMENT ON TABLE notification_histories IS '通知履歴テーブル';
COMMENT ON COLUMN notification_histories.recipient_id IS '受信者ID';
COMMENT ON COLUMN notification_histories.sender_id IS '送信者ID';
COMMENT ON COLUMN notification_histories.notification_type IS '通知種別（weekly_report_reminder, alert_notification等）';
COMMENT ON COLUMN notification_histories.title IS '通知タイトル';
COMMENT ON COLUMN notification_histories.message IS '通知メッセージ';
COMMENT ON COLUMN notification_histories.is_read IS '既読フラグ';
COMMENT ON COLUMN notification_histories.read_at IS '既読日時';
COMMENT ON COLUMN notification_histories.related_entity_type IS '関連エンティティタイプ（weekly_report, alert等）';
COMMENT ON COLUMN notification_histories.related_entity_id IS '関連エンティティID';
COMMENT ON COLUMN notification_histories.metadata IS 'メタデータ（送信方法、優先度等）';

-- パフォーマンス最適化のためのインデックス
CREATE INDEX IF NOT EXISTS idx_notification_histories_recipient_read ON notification_histories (recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_histories_type_created ON notification_histories (notification_type, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_histories_created_at ON notification_histories (created_at);
CREATE INDEX IF NOT EXISTS idx_notification_histories_related_entity ON notification_histories (related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_histories_sender ON notification_histories (sender_id);

-- 通知タイプのENUM値を定義するためのチェック制約
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