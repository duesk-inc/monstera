-- virus_scan_logs∆¸÷Înç\Ì¸Î–√Ø(	
-- Ë: Snﬁ§∞Ï¸∑ÁÛoCn200048_create_virus_scan_logs_table.up.sqlnÖπhX
CREATE TABLE IF NOT EXISTS virus_scan_logs (
    id SERIAL PRIMARY KEY,
    scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    file_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    scan_result VARCHAR(50) NOT NULL,
    virus_name VARCHAR(255),
    scan_duration_ms INTEGER NOT NULL,
    error_message TEXT,
    user_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- §Û«√Øπ
CREATE INDEX IF NOT EXISTS idx_virus_scan_logs_file_key ON virus_scan_logs(file_key);
CREATE INDEX IF NOT EXISTS idx_virus_scan_logs_scan_result ON virus_scan_logs(scan_result);
CREATE INDEX IF NOT EXISTS idx_virus_scan_logs_scanned_at ON virus_scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_virus_scan_logs_user_id ON virus_scan_logs(user_id);

-- Ë≠¸6
ALTER TABLE virus_scan_logs 
    ADD CONSTRAINT fk_virus_scan_logs_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL;