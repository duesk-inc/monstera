-- freee同期ログテーブル作成
CREATE TABLE IF NOT EXISTS freee_sync_logs (
    id VARCHAR(36) PRIMARY KEY,
    sync_type ENUM('invoice_create', 'invoice_update', 'payment_sync', 'client_sync') NOT NULL COMMENT '同期タイプ',
    target_id VARCHAR(36) COMMENT '対象ID（請求書ID等）',
    freee_id INT COMMENT 'freee側のID',
    status ENUM('success', 'failed', 'pending') NOT NULL COMMENT '同期ステータス',
    error_message TEXT COMMENT 'エラーメッセージ',
    request_data JSON COMMENT 'リクエストデータ',
    response_data JSON COMMENT 'レスポンスデータ',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_sync_logs_sync_type (sync_type),
    INDEX idx_sync_logs_status (status),
    INDEX idx_sync_logs_target_id (target_id),
    INDEX idx_sync_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='freee API同期ログ';