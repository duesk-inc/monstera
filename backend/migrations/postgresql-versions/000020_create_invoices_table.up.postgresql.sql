-- Create invoice_status enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
    END IF;
END $$;

-- 請求管理テーブルの作成
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL, -- 取引先ID
    invoice_number VARCHAR(50) NOT NULL, -- 請求書番号
    invoice_date DATE NOT NULL, -- 請求日
    due_date DATE NOT NULL, -- 支払期限
    billing_month VARCHAR(7) NOT NULL, -- 請求対象月（YYYY-MM）
    subtotal DECIMAL(10, 2) NOT NULL, -- 小計
    tax_rate DECIMAL(5, 2) DEFAULT 10.00, -- 消費税率（%）
    tax_amount DECIMAL(10, 2) NOT NULL, -- 消費税額
    total_amount DECIMAL(10, 2) NOT NULL, -- 合計金額
    status invoice_status DEFAULT 'draft', -- 請求書ステータス
    paid_date DATE, -- 入金日
    payment_method VARCHAR(50), -- 入金方法
    notes TEXT, -- 備考
    created_by VARCHAR(36), -- 作成者ID
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL, -- 削除日時
    CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES clients(id),
    CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- インデックスの作成
CREATE UNIQUE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_billing_month ON invoices(billing_month);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);

-- PostgreSQL用のコメント設定
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
COMMENT ON COLUMN invoices.created_at IS '作成日時';
COMMENT ON COLUMN invoices.updated_at IS '更新日時';
COMMENT ON COLUMN invoices.deleted_at IS '削除日時';


-- Triggers for automatic timestamp updates

-- Trigger for invoices table
CREATE OR REPLACE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
