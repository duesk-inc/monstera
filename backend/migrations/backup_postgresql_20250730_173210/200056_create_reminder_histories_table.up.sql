-- リマインド送信履歴テーブルの作成
CREATE TABLE IF NOT EXISTS reminder_histories (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY DEFAULT (UUID()),
    sender_id VARCHAR(36) NOT NULL COMMENT '送信者ID（管理者）',
    reminder_type VARCHAR(50) NOT NULL COMMENT 'リマインドタイプ（weekly_report_submission等）',
    target_week_start DATE NOT NULL COMMENT '対象週の開始日',
    target_week_end DATE NOT NULL COMMENT '対象週の終了日',
    recipient_count INT NOT NULL DEFAULT 0 COMMENT '送信対象者数',
    sent_count INT NOT NULL DEFAULT 0 COMMENT '実際の送信数',
    failed_count INT NOT NULL DEFAULT 0 COMMENT '送信失敗数',
    custom_message TEXT COMMENT 'カスタムメッセージ',
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '送信実行日時',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '送信ステータス（pending, completed, failed）',
    error_details JSON COMMENT 'エラー詳細（送信失敗時）',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_reminder_histories_sender (sender_id),
    INDEX idx_reminder_histories_type_week (reminder_type, target_week_start),
    INDEX idx_reminder_histories_sent_at (sent_at),
    INDEX idx_reminder_histories_status (status),
    
    -- 外部キー制約
    CONSTRAINT fk_reminder_histories_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='リマインド送信履歴テーブル';

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