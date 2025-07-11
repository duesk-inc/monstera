-- ENUM型の作成
DO $$
BEGIN
    -- sync_type用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'freee_sync_type') THEN
        CREATE TYPE freee_sync_type AS ENUM ('invoice_create', 'invoice_update', 'payment_sync', 'client_sync');
    END IF;
    -- status用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'freee_sync_status') THEN
        CREATE TYPE freee_sync_status AS ENUM ('success', 'failed', 'pending');
    END IF;
END$$;

-- freee同期ログテーブル作成
CREATE TABLE IF NOT EXISTS freee_sync_logs (
    id VARCHAR(36) PRIMARY KEY,
    sync_type freee_sync_type NOT NULL, -- 同期タイプ
    target_id VARCHAR(36), -- 対象ID（請求書ID等）
    freee_id INT, -- freee側のID
    status freee_sync_status NOT NULL, -- 同期ステータス
    error_message TEXT, -- エラーメッセージ
    request_data JSON, -- リクエストデータ
    response_data JSON, -- レスポンスデータ
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
); -- freee API同期ログ

-- インデックスの作成
CREATE INDEX idx_sync_logs_sync_type ON freee_sync_logs (sync_type);
CREATE INDEX idx_sync_logs_status ON freee_sync_logs (status);
CREATE INDEX idx_sync_logs_target_id ON freee_sync_logs (target_id);
CREATE INDEX idx_sync_logs_created_at ON freee_sync_logs (created_at);
