-- 請求明細テーブルの作成
CREATE TABLE IF NOT EXISTS invoice_details (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL, -- 請求書ID
    project_assignment_id VARCHAR(36), -- エンジニア案件アサインID
    description VARCHAR(255) NOT NULL, -- 明細内容
    quantity DECIMAL(10, 2) DEFAULT 1, -- 数量
    unit_price DECIMAL(10, 2) NOT NULL, -- 単価
    amount DECIMAL(10, 2) NOT NULL, -- 金額
    sort_order INT DEFAULT 0, -- 表示順
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL, -- 削除日時
    CONSTRAINT fk_invoice_details_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    CONSTRAINT fk_invoice_details_assignment FOREIGN KEY (project_assignment_id) REFERENCES project_assignments(id)
);

-- インデックスの作成
CREATE INDEX idx_invoice_details_invoice_id ON invoice_details(invoice_id);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE invoice_details IS '請求明細テーブル';
COMMENT ON COLUMN invoice_details.invoice_id IS '請求書ID';
COMMENT ON COLUMN invoice_details.project_assignment_id IS 'エンジニア案件アサインID';
COMMENT ON COLUMN invoice_details.description IS '明細内容';
COMMENT ON COLUMN invoice_details.quantity IS '数量';
COMMENT ON COLUMN invoice_details.unit_price IS '単価';
COMMENT ON COLUMN invoice_details.amount IS '金額';
COMMENT ON COLUMN invoice_details.sort_order IS '表示順';
COMMENT ON COLUMN invoice_details.created_at IS '作成日時';
COMMENT ON COLUMN invoice_details.updated_at IS '更新日時';
COMMENT ON COLUMN invoice_details.deleted_at IS '削除日時';


-- Triggers for automatic timestamp updates

-- Trigger for invoice_details table
CREATE OR REPLACE TRIGGER update_invoice_details_updated_at
    BEFORE UPDATE ON invoice_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
