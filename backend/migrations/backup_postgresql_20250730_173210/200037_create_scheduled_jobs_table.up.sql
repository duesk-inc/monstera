-- スケジュールジョブテーブル作成
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id VARCHAR(36) PRIMARY KEY,
    job_type ENUM('monthly_billing', 'freee_sync', 'payment_sync', 'client_sync') NOT NULL COMMENT 'ジョブタイプ',
    job_name VARCHAR(255) NOT NULL COMMENT 'ジョブ名',
    description TEXT COMMENT 'ジョブ説明',
    cron_expression VARCHAR(100) NOT NULL COMMENT 'cron式',
    status ENUM('active', 'inactive', 'running', 'failed') DEFAULT 'active' COMMENT 'ジョブステータス',
    last_run_at DATETIME(3) COMMENT '最終実行日時',
    next_run_at DATETIME(3) COMMENT '次回実行予定日時',
    last_result ENUM('success', 'failed', 'partial') COMMENT '最終実行結果',
    error_message TEXT COMMENT 'エラーメッセージ',
    run_count INT DEFAULT 0 COMMENT '実行回数',
    success_count INT DEFAULT 0 COMMENT '成功回数',
    failure_count INT DEFAULT 0 COMMENT '失敗回数',
    parameters JSON COMMENT 'ジョブパラメータ',
    timeout_seconds INT DEFAULT 3600 COMMENT 'タイムアウト（秒）',
    max_retries INT DEFAULT 3 COMMENT '最大再試行回数',
    retry_count INT DEFAULT 0 COMMENT '現在の再試行回数',
    created_by VARCHAR(36) NOT NULL COMMENT '作成者ID',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    INDEX idx_scheduled_jobs_job_type (job_type),
    INDEX idx_scheduled_jobs_status (status),
    INDEX idx_scheduled_jobs_next_run_at (next_run_at),
    INDEX idx_scheduled_jobs_deleted_at (deleted_at),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='スケジュールジョブ管理';

-- 初期データ挿入（月次請求処理ジョブ）
INSERT INTO scheduled_jobs (
    id, 
    job_type, 
    job_name, 
    description, 
    cron_expression, 
    status, 
    parameters,
    timeout_seconds,
    created_by
) VALUES (
    UUID(),
    'monthly_billing',
    '月次請求処理（毎月末日）',
    '全取引先に対する月次請求書の自動作成処理',
    '0 2 L * *',
    'inactive',
    JSON_OBJECT(
        'auto_freee_sync', true,
        'dry_run', false,
        'notification_enabled', true
    ),
    7200,
    (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1)
);

-- freee同期ジョブ
INSERT INTO scheduled_jobs (
    id, 
    job_type, 
    job_name, 
    description, 
    cron_expression, 
    status, 
    parameters,
    timeout_seconds,
    created_by
) VALUES (
    UUID(),
    'payment_sync',
    'freee入金情報同期（日次）',
    'freee APIから入金情報を取得して同期',
    '0 6 * * *',
    'inactive',
    JSON_OBJECT(
        'sync_days_back', 7,
        'notification_enabled', false
    ),
    1800,
    (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1)
);