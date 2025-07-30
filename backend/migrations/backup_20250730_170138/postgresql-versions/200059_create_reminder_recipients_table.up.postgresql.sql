-- リマインド受信者詳細テーブルの作成
CREATE TABLE IF NOT EXISTS reminder_recipients (
    id VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    reminder_history_id VARCHAR(36) NOT NULL, -- リマインド履歴ID
    recipient_id VARCHAR(36) NOT NULL, -- 受信者ID
    recipient_email VARCHAR(255) NOT NULL, -- 受信者メールアドレス
    recipient_name VARCHAR(200) NOT NULL, -- 受信者名
    department_name VARCHAR(100), -- 所属部署名（送信時点）
    send_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        send_status IN ('pending', 'sending', 'sent', 'failed', 'skipped')
    ), -- 送信ステータス
    sent_at TIMESTAMP NULL, -- 送信完了日時
    delivery_status VARCHAR(20) CHECK (
        delivery_status IS NULL OR delivery_status IN (
            'delivered', 'bounced', 'rejected', 'deferred', 'spam'
        )
    ), -- 配信ステータス（delivered, bounced, etc）
    error_message TEXT, -- エラーメッセージ
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    -- 外部キー制約
    CONSTRAINT fk_reminder_recipients_history FOREIGN KEY (reminder_history_id) REFERENCES reminder_histories(id) ON DELETE CASCADE,
    CONSTRAINT fk_reminder_recipients_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_reminder_recipients_history ON reminder_recipients(reminder_history_id);
CREATE INDEX idx_reminder_recipients_recipient ON reminder_recipients(recipient_id);
CREATE INDEX idx_reminder_recipients_status ON reminder_recipients(send_status);
CREATE INDEX idx_reminder_recipients_sent_at ON reminder_recipients(sent_at);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE reminder_recipients IS 'リマインド受信者詳細テーブル';
COMMENT ON COLUMN reminder_recipients.reminder_history_id IS 'リマインド履歴ID';
COMMENT ON COLUMN reminder_recipients.recipient_id IS '受信者ID';
COMMENT ON COLUMN reminder_recipients.recipient_email IS '受信者メールアドレス';
COMMENT ON COLUMN reminder_recipients.recipient_name IS '受信者名';
COMMENT ON COLUMN reminder_recipients.department_name IS '所属部署名（送信時点）';
COMMENT ON COLUMN reminder_recipients.send_status IS '送信ステータス';
COMMENT ON COLUMN reminder_recipients.sent_at IS '送信完了日時';
COMMENT ON COLUMN reminder_recipients.delivery_status IS '配信ステータス（delivered, bounced, etc）';
COMMENT ON COLUMN reminder_recipients.error_message IS 'エラーメッセージ';


-- Triggers for automatic timestamp updates

-- Trigger for reminder_recipients table
CREATE OR REPLACE TRIGGER update_reminder_recipients_updated_at
    BEFORE UPDATE ON reminder_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
