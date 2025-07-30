-- invoicesテーブルに経理機能用カラムを追加
ALTER TABLE invoices 
    ADD COLUMN freee_invoice_id INT COMMENT 'freee請求書ID',
    ADD COLUMN freee_company_id INT DEFAULT 12078529 COMMENT 'freee事業所ID',
    ADD COLUMN freee_sync_status ENUM('synced', 'pending', 'failed') DEFAULT 'pending' COMMENT 'freee同期ステータス',
    ADD COLUMN freee_synced_at DATETIME(3) COMMENT 'freee同期日時',
    ADD COLUMN project_group_id VARCHAR(36) COMMENT 'プロジェクトグループID',
    ADD INDEX idx_invoices_freee_invoice_id (freee_invoice_id),
    ADD INDEX idx_invoices_freee_sync_status (freee_sync_status),
    ADD INDEX idx_invoices_project_group_id (project_group_id),
    ADD FOREIGN KEY (project_group_id) REFERENCES project_groups(id) ON DELETE SET NULL;