-- export_jobsテーブルを作成
CREATE TABLE IF NOT EXISTS export_jobs (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    format VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    parameters JSON,
    progress INT NOT NULL DEFAULT 0,
    total_records INT NOT NULL DEFAULT 0,
    processed_rows INT NOT NULL DEFAULT 0,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    error_message TEXT,
    started_at TIMESTAMP NULL DEFAULT NULL,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_job_type (job_type),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at),
    
    CONSTRAINT fk_export_jobs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ジョブタイプのENUM型チェック制約
ALTER TABLE export_jobs ADD CONSTRAINT chk_job_type 
CHECK (job_type IN ('weekly_report', 'monthly_attendance', 'monthly_summary'));

-- フォーマットのENUM型チェック制約
ALTER TABLE export_jobs ADD CONSTRAINT chk_format
CHECK (format IN ('csv', 'excel', 'pdf'));

-- ステータスのENUM型チェック制約
ALTER TABLE export_jobs ADD CONSTRAINT chk_status
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));