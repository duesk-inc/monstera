-- clientsテーブルに経理機能用カラムを追加
ALTER TABLE clients 
    ADD COLUMN billing_closing_day INT DEFAULT 31 COMMENT '請求締め日（1-31、31は月末）',
    ADD COLUMN freee_client_id INT COMMENT 'freee取引先ID',
    ADD COLUMN freee_sync_status ENUM('synced', 'pending', 'failed') DEFAULT 'pending' COMMENT 'freee同期ステータス',
    ADD COLUMN freee_synced_at DATETIME(3) COMMENT 'freee同期日時',
    ADD INDEX idx_clients_freee_client_id (freee_client_id),
    ADD INDEX idx_clients_freee_sync_status (freee_sync_status);