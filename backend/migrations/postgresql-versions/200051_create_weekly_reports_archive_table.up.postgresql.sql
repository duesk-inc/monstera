-- Create ENUM types for status
CREATE TYPE weekly_report_archive_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
CREATE TYPE archive_reason_enum AS ENUM ('retention_policy', 'manual', 'data_migration');
CREATE TYPE archive_type_enum AS ENUM ('weekly_reports', 'daily_records', 'work_hours', 'bulk_archive');
CREATE TYPE execution_method_enum AS ENUM ('batch', 'manual', 'api');
CREATE TYPE archive_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- weekly_reports_archiveテーブルを作成
-- アーカイブされた週報データを保存するテーブル
CREATE TABLE IF NOT EXISTS weekly_reports_archive (
    id CHAR(36) NOT NULL PRIMARY KEY,
    original_id CHAR(36) NOT NULL, -- 元の週報ID
    user_id CHAR(36) NOT NULL,
    user_name VARCHAR(255) NOT NULL, -- アーカイブ時点のユーザー名を保持
    user_email VARCHAR(255) NOT NULL, -- アーカイブ時点のメールアドレスを保持
    department_id CHAR(36),
    department_name VARCHAR(255), -- アーカイブ時点の部署名を保持
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status weekly_report_archive_status NOT NULL DEFAULT 'draft',
    mood SMALLINT NOT NULL DEFAULT 1 CHECK (mood BETWEEN 1 AND 5),
    total_work_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    client_total_work_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    comment TEXT,
    manager_comment TEXT,
    submitted_at TIMESTAMP NULL DEFAULT NULL,
    commented_at TIMESTAMP NULL DEFAULT NULL,
    
    -- アーカイブ関連フィールド
    archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_by CHAR(36) NOT NULL, -- アーカイブを実行したユーザーID
    archive_reason archive_reason_enum NOT NULL DEFAULT 'retention_policy',
    fiscal_year INTEGER NOT NULL, -- 会計年度
    fiscal_quarter SMALLINT NOT NULL CHECK (fiscal_quarter BETWEEN 1 AND 4), -- 四半期
    
    -- 元の作成・更新時刻
    original_created_at TIMESTAMP NOT NULL,
    original_updated_at TIMESTAMP NOT NULL,
    
    -- アーカイブテーブルの管理フィールド
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_weekly_reports_archive_archived_by 
        FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create indexes for weekly_reports_archive
CREATE INDEX IF NOT EXISTS idx_original_id ON weekly_reports_archive (original_id);
CREATE INDEX IF NOT EXISTS idx_user_id ON weekly_reports_archive (user_id);
CREATE INDEX IF NOT EXISTS idx_department_id ON weekly_reports_archive (department_id);
CREATE INDEX IF NOT EXISTS idx_archived_at ON weekly_reports_archive (archived_at);
CREATE INDEX IF NOT EXISTS idx_fiscal_year_quarter ON weekly_reports_archive (fiscal_year, fiscal_quarter);
CREATE INDEX IF NOT EXISTS idx_start_date ON weekly_reports_archive (start_date);
CREATE INDEX IF NOT EXISTS idx_end_date ON weekly_reports_archive (end_date);
CREATE INDEX IF NOT EXISTS idx_status ON weekly_reports_archive (status);
CREATE INDEX IF NOT EXISTS idx_archive_reason ON weekly_reports_archive (archive_reason);

-- 複合インデックス
CREATE INDEX IF NOT EXISTS idx_user_fiscal ON weekly_reports_archive (user_id, fiscal_year, fiscal_quarter);
CREATE INDEX IF NOT EXISTS idx_department_fiscal ON weekly_reports_archive (department_id, fiscal_year, fiscal_quarter);

-- daily_records_archiveテーブルを作成
-- アーカイブされた日次記録データを保存するテーブル
CREATE TABLE IF NOT EXISTS daily_records_archive (
    id CHAR(36) NOT NULL PRIMARY KEY,
    original_id CHAR(36) NOT NULL, -- 元の日次記録ID
    weekly_report_archive_id CHAR(36) NOT NULL, -- アーカイブされた週報ID
    original_weekly_report_id CHAR(36) NOT NULL, -- 元の週報ID
    record_date DATE NOT NULL,
    is_holiday BOOLEAN NOT NULL DEFAULT FALSE,
    is_holiday_work BOOLEAN NOT NULL DEFAULT FALSE,
    company_work_hours DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    client_work_hours DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    total_work_hours DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    break_time DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    overtime_hours DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    remarks TEXT,
    
    -- アーカイブ関連フィールド
    archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 元の作成・更新時刻
    original_created_at TIMESTAMP NOT NULL,
    original_updated_at TIMESTAMP NOT NULL,
    
    -- アーカイブテーブルの管理フィールド
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_daily_records_archive_weekly_report 
        FOREIGN KEY (weekly_report_archive_id) REFERENCES weekly_reports_archive(id) ON DELETE CASCADE
);

-- Create indexes for daily_records_archive
CREATE INDEX IF NOT EXISTS idx_original_id ON daily_records_archive (original_id);
CREATE INDEX IF NOT EXISTS idx_weekly_report_archive_id ON daily_records_archive (weekly_report_archive_id);
CREATE INDEX IF NOT EXISTS idx_original_weekly_report_id ON daily_records_archive (original_weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_record_date ON daily_records_archive (record_date);
CREATE INDEX IF NOT EXISTS idx_archived_at ON daily_records_archive (archived_at);

-- work_hours_archiveテーブルを作成
-- アーカイブされた勤怠時間データを保存するテーブル
CREATE TABLE IF NOT EXISTS work_hours_archive (
    id CHAR(36) NOT NULL PRIMARY KEY,
    original_id CHAR(36) NOT NULL, -- 元の勤怠時間ID
    weekly_report_archive_id CHAR(36) NOT NULL, -- アーカイブされた週報ID
    original_weekly_report_id CHAR(36) NOT NULL, -- 元の週報ID
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    break_time DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    overtime_start_time TIME,
    overtime_end_time TIME,
    remarks TEXT,
    
    -- アーカイブ関連フィールド
    archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 元の作成・更新時刻
    original_created_at TIMESTAMP NOT NULL,
    original_updated_at TIMESTAMP NOT NULL,
    
    -- アーカイブテーブルの管理フィールド
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_work_hours_archive_weekly_report 
        FOREIGN KEY (weekly_report_archive_id) REFERENCES weekly_reports_archive(id) ON DELETE CASCADE
);

-- Create indexes for work_hours_archive
CREATE INDEX IF NOT EXISTS idx_original_id ON work_hours_archive (original_id);
CREATE INDEX IF NOT EXISTS idx_weekly_report_archive_id ON work_hours_archive (weekly_report_archive_id);
CREATE INDEX IF NOT EXISTS idx_original_weekly_report_id ON work_hours_archive (original_weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_date ON work_hours_archive (date);
CREATE INDEX IF NOT EXISTS idx_archived_at ON work_hours_archive (archived_at);

-- アーカイブ統計テーブルを作成
-- アーカイブ処理の履歴と統計を管理
CREATE TABLE IF NOT EXISTS archive_statistics (
    id CHAR(36) NOT NULL PRIMARY KEY,
    archive_type archive_type_enum NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter SMALLINT CHECK (fiscal_quarter BETWEEN 1 AND 4),
    start_date DATE NOT NULL, -- アーカイブ対象期間の開始日
    end_date DATE NOT NULL, -- アーカイブ対象期間の終了日
    total_records INT NOT NULL DEFAULT 0, -- アーカイブ対象レコード数
    archived_records INT NOT NULL DEFAULT 0, -- 実際にアーカイブされたレコード数
    failed_records INT NOT NULL DEFAULT 0, -- アーカイブに失敗したレコード数
    archive_reason archive_reason_enum NOT NULL DEFAULT 'retention_policy',
    executed_by CHAR(36) NOT NULL, -- 実行者ID
    execution_method execution_method_enum NOT NULL DEFAULT 'batch',
    status archive_status_enum NOT NULL DEFAULT 'pending',
    error_message TEXT,
    started_at TIMESTAMP NULL DEFAULT NULL,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    duration_seconds INT, -- 処理時間（秒）
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_archive_statistics_executed_by 
        FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create indexes for archive_statistics
CREATE INDEX IF NOT EXISTS idx_archive_type ON archive_statistics (archive_type);
CREATE INDEX IF NOT EXISTS idx_fiscal_year_quarter ON archive_statistics (fiscal_year, fiscal_quarter);
CREATE INDEX IF NOT EXISTS idx_executed_by ON archive_statistics (executed_by);
CREATE INDEX IF NOT EXISTS idx_status ON archive_statistics (status);
CREATE INDEX IF NOT EXISTS idx_started_at ON archive_statistics (started_at);
CREATE INDEX IF NOT EXISTS idx_completed_at ON archive_statistics (completed_at);

-- Triggers for automatic timestamp updates

-- Trigger for weekly_reports_archive table
DROP TRIGGER IF EXISTS update_weekly_reports_archive_updated_at ON weekly_reports_archive;
CREATE TRIGGER update_weekly_reports_archive_updated_at
    BEFORE UPDATE ON weekly_reports_archive
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for daily_records_archive table
DROP TRIGGER IF EXISTS update_daily_records_archive_updated_at ON daily_records_archive;
CREATE TRIGGER update_daily_records_archive_updated_at
    BEFORE UPDATE ON daily_records_archive
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for work_hours_archive table
DROP TRIGGER IF EXISTS update_work_hours_archive_updated_at ON work_hours_archive;
CREATE TRIGGER update_work_hours_archive_updated_at
    BEFORE UPDATE ON work_hours_archive
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for archive_statistics table
DROP TRIGGER IF EXISTS update_archive_statistics_updated_at ON archive_statistics;
CREATE TRIGGER update_archive_statistics_updated_at
    BEFORE UPDATE ON archive_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();