-- clientsテーブルに経理機能用カラムを追加（PostgreSQL版）

-- freee同期ステータスのENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'freee_sync_status_enum') THEN
        CREATE TYPE freee_sync_status_enum AS ENUM ('synced', 'pending', 'failed');
    END IF;
END $$;

-- カラムの追加
ALTER TABLE clients 
    ADD COLUMN IF NOT EXISTS billing_closing_day INT DEFAULT 31, -- 請求締め日（1-31、31は月末）
    ADD COLUMN IF NOT EXISTS freee_client_id INT, -- freee取引先ID
    ADD COLUMN IF NOT EXISTS freee_sync_status freee_sync_status_enum DEFAULT 'pending', -- freee同期ステータス
    ADD COLUMN IF NOT EXISTS freee_synced_at TIMESTAMP(3); -- freee同期日時

-- コメントの追加
COMMENT ON COLUMN clients.billing_closing_day IS '請求締め日（1-31、31は月末）';
COMMENT ON COLUMN clients.freee_client_id IS 'freee取引先ID';
COMMENT ON COLUMN clients.freee_sync_status IS 'freee同期ステータス';
COMMENT ON COLUMN clients.freee_synced_at IS 'freee同期日時';

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_clients_freee_client_id ON clients(freee_client_id);
CREATE INDEX IF NOT EXISTS idx_clients_freee_sync_status ON clients(freee_sync_status);