-- invoicesテーブル作成（全カラム統合版）
-- 統合元:
-- - 000020_create_invoices_table.up.postgresql.sql
-- - 200034_extend_invoices_for_accounting.up.postgresql.sql

-- ENUM型の作成
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'freee_sync_status_enum') THEN
        CREATE TYPE freee_sync_status_enum AS ENUM ('synced', 'pending', 'failed');
    END IF;
END $$;

-- 請求管理テーブルの作成
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY,
    -- 基本情報
    client_id VARCHAR(36) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    billing_month VARCHAR(7) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 10.00,
    tax_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status invoice_status DEFAULT 'draft',
    paid_date DATE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_by VARCHAR(255),
    -- 統合: 200034から経理機能用カラム
    freee_invoice_id INT,
    freee_company_id INT DEFAULT 12078529,
    freee_sync_status freee_sync_status_enum DEFAULT 'pending',
    freee_synced_at TIMESTAMP(3),
    project_group_id VARCHAR(36),
    -- タイムスタンプ
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP(3) NULL,
    -- 外部キー制約
    CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES clients(id),
    CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- インデックス
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_month ON invoices(billing_month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_freee_invoice_id ON invoices(freee_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_freee_sync_status ON invoices(freee_sync_status);
CREATE INDEX IF NOT EXISTS idx_invoices_project_group_id ON invoices(project_group_id);

-- コメント
COMMENT ON TABLE invoices IS '請求管理テーブル';
COMMENT ON COLUMN invoices.client_id IS '取引先ID';
COMMENT ON COLUMN invoices.invoice_number IS '請求書番号';
COMMENT ON COLUMN invoices.invoice_date IS '請求日';
COMMENT ON COLUMN invoices.due_date IS '支払期限';
COMMENT ON COLUMN invoices.billing_month IS '請求対象月（YYYY-MM）';
COMMENT ON COLUMN invoices.subtotal IS '小計';
COMMENT ON COLUMN invoices.tax_rate IS '消費税率（%）';
COMMENT ON COLUMN invoices.tax_amount IS '消費税額';
COMMENT ON COLUMN invoices.total_amount IS '合計金額';
COMMENT ON COLUMN invoices.status IS '請求書ステータス';
COMMENT ON COLUMN invoices.paid_date IS '入金日';
COMMENT ON COLUMN invoices.payment_method IS '入金方法';
COMMENT ON COLUMN invoices.notes IS '備考';
COMMENT ON COLUMN invoices.created_by IS '作成者ID';
COMMENT ON COLUMN invoices.freee_invoice_id IS 'freee請求書ID';
COMMENT ON COLUMN invoices.freee_company_id IS 'freee事業所ID';
COMMENT ON COLUMN invoices.freee_sync_status IS 'freee同期ステータス';
COMMENT ON COLUMN invoices.freee_synced_at IS 'freee同期日時';
COMMENT ON COLUMN invoices.project_group_id IS 'プロジェクトグループID';

-- トリガー
CREATE OR REPLACE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- project_groupsテーブルが存在する場合のみ外部キー制約を追加
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_groups') THEN
        ALTER TABLE invoices
            ADD CONSTRAINT fk_invoices_project_group 
            FOREIGN KEY (project_group_id) 
            REFERENCES project_groups(id) 
            ON DELETE SET NULL;
    END IF;
END $$;