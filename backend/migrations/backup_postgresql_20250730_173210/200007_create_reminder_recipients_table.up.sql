-- リマインド受信者詳細テーブルの作成
CREATE TABLE IF NOT EXISTS reminder_recipients (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY DEFAULT (UUID()),
    reminder_history_id VARCHAR(36) NOT NULL COMMENT 'リマインド履歴ID',
    recipient_id VARCHAR(36) NOT NULL COMMENT '受信者ID',
    recipient_email VARCHAR(255) NOT NULL COMMENT '受信者メールアドレス',
    recipient_name VARCHAR(200) NOT NULL COMMENT '受信者名',
    department_name VARCHAR(100) COMMENT '所属部署名（送信時点）',
    send_status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '送信ステータス',
    sent_at TIMESTAMP NULL COMMENT '送信完了日時',
    delivery_status VARCHAR(20) COMMENT '配信ステータス（delivered, bounced, etc）',
    error_message TEXT COMMENT 'エラーメッセージ',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_reminder_recipients_history (reminder_history_id),
    INDEX idx_reminder_recipients_recipient (recipient_id),
    INDEX idx_reminder_recipients_status (send_status),
    INDEX idx_reminder_recipients_sent_at (sent_at),
    
    -- 外部キー制約
    CONSTRAINT fk_reminder_recipients_history FOREIGN KEY (reminder_history_id) REFERENCES reminder_histories(id) ON DELETE CASCADE,
    CONSTRAINT fk_reminder_recipients_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='リマインド受信者詳細テーブル';

-- 送信ステータスのチェック制約
ALTER TABLE reminder_recipients 
ADD CONSTRAINT chk_send_status CHECK (
    send_status IN ('pending', 'sending', 'sent', 'failed', 'skipped')
);

-- 配信ステータスのチェック制約
ALTER TABLE reminder_recipients 
ADD CONSTRAINT chk_delivery_status CHECK (
    delivery_status IS NULL OR delivery_status IN (
        'delivered', 'bounced', 'rejected', 'deferred', 'spam'
    )
);