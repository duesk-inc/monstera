-- ENUM型の作成
DO $$
BEGIN
    -- job_type用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduled_job_type') THEN
        CREATE TYPE scheduled_job_type AS ENUM ('monthly_billing', 'freee_sync', 'payment_sync', 'client_sync');
    END IF;
    -- status用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduled_job_status') THEN
        CREATE TYPE scheduled_job_status AS ENUM ('active', 'inactive', 'running', 'failed');
    END IF;
    -- last_result用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scheduled_job_result') THEN
        CREATE TYPE scheduled_job_result AS ENUM ('success', 'failed', 'partial');
    END IF;
END$$;

-- スケジュールジョブテーブル作成
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id VARCHAR(36) PRIMARY KEY,
    job_type scheduled_job_type NOT NULL, -- ジョブタイプ
    job_name VARCHAR(255) NOT NULL, -- ジョブ名
    description TEXT, -- ジョブ説明
    cron_expression VARCHAR(100) NOT NULL, -- cron式
    status scheduled_job_status DEFAULT 'active', -- ジョブステータス
    last_run_at TIMESTAMP(3), -- 最終実行日時
    next_run_at TIMESTAMP(3), -- 次回実行予定日時
    last_result scheduled_job_result, -- 最終実行結果
    error_message TEXT, -- エラーメッセージ
    run_count INT DEFAULT 0, -- 実行回数
    success_count INT DEFAULT 0, -- 成功回数
    failure_count INT DEFAULT 0, -- 失敗回数
    parameters JSON, -- ジョブパラメータ
    timeout_seconds INT DEFAULT 3600, -- タイムアウト（秒）
    max_retries INT DEFAULT 3, -- 最大再試行回数
    retry_count INT DEFAULT 0, -- 現在の再試行回数
    created_by VARCHAR(255) NOT NULL, -- 作成者ID
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP(3) NULL,
    CONSTRAINT fk_scheduled_jobs_user FOREIGN KEY (created_by) REFERENCES users(id)
); -- スケジュールジョブ管理

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_type ON scheduled_jobs (job_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs (status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run_at ON scheduled_jobs (next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_deleted_at ON scheduled_jobs (deleted_at);

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
    gen_random_uuid()::VARCHAR,
    'monthly_billing',
    '月次請求処理（毎月末日）',
    '全取引先に対する月次請求書の自動作成処理',
    '0 2 L * *',
    'inactive',
    json_build_object(
        'auto_freee_sync', true,
        'dry_run', false,
        'notification_enabled', true
    ),
    7200,
    (SELECT id FROM users WHERE role = 2 ORDER BY created_at LIMIT 1)
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
    gen_random_uuid()::VARCHAR,
    'payment_sync',
    'freee入金情報同期（日次）',
    'freee APIから入金情報を取得して同期',
    '0 6 * * *',
    'inactive',
    json_build_object(
        'sync_days_back', 7,
        'notification_enabled', false
    ),
    1800,
    (SELECT id FROM users WHERE role = 2 ORDER BY created_at LIMIT 1)
);


-- Triggers for automatic timestamp updates

-- Trigger for scheduled_jobs table
CREATE OR REPLACE TRIGGER update_scheduled_jobs_updated_at
    BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
