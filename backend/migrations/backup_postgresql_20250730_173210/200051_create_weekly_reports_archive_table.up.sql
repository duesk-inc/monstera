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
    status ENUM('draft', 'submitted', 'approved', 'rejected') NOT NULL DEFAULT 'draft',
    mood TINYINT NOT NULL DEFAULT 1 CHECK (mood BETWEEN 1 AND 5),
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
    archive_reason ENUM('retention_policy', 'manual', 'data_migration') NOT NULL DEFAULT 'retention_policy',
    fiscal_year YEAR NOT NULL, -- 会計年度
    fiscal_quarter TINYINT NOT NULL CHECK (fiscal_quarter BETWEEN 1 AND 4), -- 四半期
    
    -- 元の作成・更新時刻
    original_created_at TIMESTAMP NOT NULL,
    original_updated_at TIMESTAMP NOT NULL,
    
    -- アーカイブテーブルの管理フィールド
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_original_id (original_id),
    INDEX idx_user_id (user_id),
    INDEX idx_department_id (department_id),
    INDEX idx_archived_at (archived_at),
    INDEX idx_fiscal_year_quarter (fiscal_year, fiscal_quarter),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_status (status),
    INDEX idx_archive_reason (archive_reason),
    
    -- 複合インデックス
    INDEX idx_user_fiscal (user_id, fiscal_year, fiscal_quarter),
    INDEX idx_department_fiscal (department_id, fiscal_year, fiscal_quarter),
    
    -- 外部キー制約
    CONSTRAINT fk_weekly_reports_archive_archived_by 
        FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_original_id (original_id),
    INDEX idx_weekly_report_archive_id (weekly_report_archive_id),
    INDEX idx_original_weekly_report_id (original_weekly_report_id),
    INDEX idx_record_date (record_date),
    INDEX idx_archived_at (archived_at),
    
    -- 外部キー制約
    CONSTRAINT fk_daily_records_archive_weekly_report 
        FOREIGN KEY (weekly_report_archive_id) REFERENCES weekly_reports_archive(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_original_id (original_id),
    INDEX idx_weekly_report_archive_id (weekly_report_archive_id),
    INDEX idx_original_weekly_report_id (original_weekly_report_id),
    INDEX idx_date (date),
    INDEX idx_archived_at (archived_at),
    
    -- 外部キー制約
    CONSTRAINT fk_work_hours_archive_weekly_report 
        FOREIGN KEY (weekly_report_archive_id) REFERENCES weekly_reports_archive(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- アーカイブ統計テーブルを作成
-- アーカイブ処理の履歴と統計を管理
CREATE TABLE IF NOT EXISTS archive_statistics (
    id CHAR(36) NOT NULL PRIMARY KEY,
    archive_type ENUM('weekly_reports', 'daily_records', 'work_hours', 'bulk_archive') NOT NULL,
    fiscal_year YEAR NOT NULL,
    fiscal_quarter TINYINT CHECK (fiscal_quarter BETWEEN 1 AND 4),
    start_date DATE NOT NULL, -- アーカイブ対象期間の開始日
    end_date DATE NOT NULL, -- アーカイブ対象期間の終了日
    total_records INT NOT NULL DEFAULT 0, -- アーカイブ対象レコード数
    archived_records INT NOT NULL DEFAULT 0, -- 実際にアーカイブされたレコード数
    failed_records INT NOT NULL DEFAULT 0, -- アーカイブに失敗したレコード数
    archive_reason ENUM('retention_policy', 'manual', 'data_migration') NOT NULL DEFAULT 'retention_policy',
    executed_by CHAR(36) NOT NULL, -- 実行者ID
    execution_method ENUM('batch', 'manual', 'api') NOT NULL DEFAULT 'batch',
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    error_message TEXT,
    started_at TIMESTAMP NULL DEFAULT NULL,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    duration_seconds INT, -- 処理時間（秒）
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_archive_type (archive_type),
    INDEX idx_fiscal_year_quarter (fiscal_year, fiscal_quarter),
    INDEX idx_executed_by (executed_by),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at),
    INDEX idx_completed_at (completed_at),
    
    -- 外部キー制約
    CONSTRAINT fk_archive_statistics_executed_by 
        FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;