-- リマインド送信履歴テーブルの作成
CREATE TABLE IF NOT EXISTS reminder_histories (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sender_id VARCHAR(255) NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    target_week_start DATE NOT NULL,
    target_week_end DATE NOT NULL,
    recipient_count INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    custom_message TEXT,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_details JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_reminder_histories_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments on reminder_histories columns
COMMENT ON TABLE reminder_histories IS 'リマインド送信履歴テーブル';
COMMENT ON COLUMN reminder_histories.sender_id IS '送信者ID（管理者）';
COMMENT ON COLUMN reminder_histories.reminder_type IS 'リマインドタイプ（weekly_report_submission等）';
COMMENT ON COLUMN reminder_histories.target_week_start IS '対象週の開始日';
COMMENT ON COLUMN reminder_histories.target_week_end IS '対象週の終了日';
COMMENT ON COLUMN reminder_histories.recipient_count IS '送信対象者数';
COMMENT ON COLUMN reminder_histories.sent_count IS '実際の送信数';
COMMENT ON COLUMN reminder_histories.failed_count IS '送信失敗数';
COMMENT ON COLUMN reminder_histories.custom_message IS 'カスタムメッセージ';
COMMENT ON COLUMN reminder_histories.sent_at IS '送信実行日時';
COMMENT ON COLUMN reminder_histories.status IS '送信ステータス（pending, completed, failed）';
COMMENT ON COLUMN reminder_histories.error_details IS 'エラー詳細（送信失敗時）';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_reminder_histories_sender ON reminder_histories (sender_id);
CREATE INDEX IF NOT EXISTS idx_reminder_histories_type_week ON reminder_histories (reminder_type, target_week_start);
CREATE INDEX IF NOT EXISTS idx_reminder_histories_sent_at ON reminder_histories (sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_histories_status ON reminder_histories (status);

-- リマインドタイプのチェック制約
ALTER TABLE reminder_histories 
ADD CONSTRAINT chk_reminder_type CHECK (
    reminder_type IN (
        'weekly_report_submission',
        'weekly_report_overdue',
        'general_reminder'
    )
);

-- ステータスのチェック制約
ALTER TABLE reminder_histories 
ADD CONSTRAINT chk_reminder_status CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
);

-- Triggers for automatic timestamp updates

-- Trigger for reminder_histories table
DROP TRIGGER IF EXISTS update_reminder_histories_updated_at ON reminder_histories;
CREATE TRIGGER update_reminder_histories_updated_at
    BEFORE UPDATE ON reminder_histories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();