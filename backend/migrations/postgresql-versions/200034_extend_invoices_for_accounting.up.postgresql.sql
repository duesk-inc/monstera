-- invoicesテーブルに経理機能用カラムを追加（PostgreSQL版）

-- freee_sync_statusカラムが既に存在しない場合のみENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'freee_sync_status_enum') THEN
        CREATE TYPE freee_sync_status_enum AS ENUM ('synced', 'pending', 'failed');
    END IF;
END $$;

-- カラムの追加
ALTER TABLE invoices 
    ADD COLUMN IF NOT EXISTS freee_invoice_id INT, -- freee請求書ID
    ADD COLUMN IF NOT EXISTS freee_company_id INT DEFAULT 12078529, -- freee事業所ID
    ADD COLUMN IF NOT EXISTS freee_sync_status freee_sync_status_enum DEFAULT 'pending', -- freee同期ステータス
    ADD COLUMN IF NOT EXISTS freee_synced_at TIMESTAMP(3), -- freee同期日時
    ADD COLUMN IF NOT EXISTS project_group_id VARCHAR(36); -- プロジェクトグループID

-- コメントの追加
COMMENT ON COLUMN invoices.freee_invoice_id IS 'freee請求書ID';
COMMENT ON COLUMN invoices.freee_company_id IS 'freee事業所ID';
COMMENT ON COLUMN invoices.freee_sync_status IS 'freee同期ステータス';
COMMENT ON COLUMN invoices.freee_synced_at IS 'freee同期日時';
COMMENT ON COLUMN invoices.project_group_id IS 'プロジェクトグループID';

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_invoices_freee_invoice_id ON invoices(freee_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_freee_sync_status ON invoices(freee_sync_status);
CREATE INDEX IF NOT EXISTS idx_invoices_project_group_id ON invoices(project_group_id);

-- 外部キー制約の追加
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_groups') AND
       NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_invoices_project_group' 
                   AND table_name = 'invoices') THEN
        ALTER TABLE invoices
            ADD CONSTRAINT fk_invoices_project_group 
            FOREIGN KEY (project_group_id) 
            REFERENCES project_groups(id) 
            ON DELETE SET NULL;
    END IF;
END $$;