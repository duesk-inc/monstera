-- ENUM型の作成
DO $$
BEGIN
    -- job_type用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_job_type') THEN
        CREATE TYPE export_job_type AS ENUM ('weekly_report', 'monthly_attendance', 'monthly_summary');
    END IF;
    -- format用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_format') THEN
        CREATE TYPE export_format AS ENUM ('csv', 'excel', 'pdf');
    END IF;
    -- status用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_status') THEN
        CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
    END IF;
END$$;

-- export_jobsテーブルを作成
CREATE TABLE IF NOT EXISTS export_jobs (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    job_type export_job_type NOT NULL,
    format export_format NOT NULL,
    status export_status NOT NULL DEFAULT 'pending',
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
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    CONSTRAINT fk_export_jobs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX idx_export_jobs_user_id ON export_jobs (user_id);
CREATE INDEX idx_export_jobs_status ON export_jobs (status);
CREATE INDEX idx_export_jobs_job_type ON export_jobs (job_type);
CREATE INDEX idx_export_jobs_created_at ON export_jobs (created_at);
CREATE INDEX idx_export_jobs_expires_at ON export_jobs (expires_at);


-- Triggers for automatic timestamp updates

-- Trigger for export_jobs table
CREATE OR REPLACE TRIGGER update_export_jobs_updated_at
    BEFORE UPDATE ON export_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
