-- WeeklyReports テーブル作成
CREATE TABLE IF NOT EXISTS weekly_reports (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft' NOT NULL COMMENT 'ステータス（draft:下書き, submitted:提出済み, approved:承認済み, rejected:却下）',
  mood INT NOT NULL DEFAULT 3,
  weekly_remarks TEXT,
  workplace_name VARCHAR(100),
  workplace_hours VARCHAR(100),
  workplace_change_requested BOOLEAN DEFAULT FALSE,
  total_work_hours DECIMAL(5,2),
  client_total_work_hours DECIMAL(5,2) DEFAULT 0,
  client_work_hours DECIMAL(5,2) DEFAULT 0 COMMENT '顧客向け作業時間',
  submitted_at TIMESTAMP NULL,
  manager_comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '管理者コメント',
  commented_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'コメント者ID',
  commented_at DATETIME(3) COMMENT 'コメント日時',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (commented_by) REFERENCES users(id),
  INDEX idx_weekly_reports_commented_at (commented_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- DailyRecords テーブル作成
CREATE TABLE IF NOT EXISTS daily_records (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  weekly_report_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  date DATE NOT NULL,
  start_time VARCHAR(10) NULL,
  end_time VARCHAR(10) NULL,
  break_time DECIMAL(5,2) NULL,
  work_hours DECIMAL(5,2) NULL,
  client_start_time VARCHAR(10) NULL,
  client_end_time VARCHAR(10) NULL,
  client_break_time DECIMAL(5,2) NULL,
  client_work_hours DECIMAL(5,2) NULL,
  has_client_work BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  is_holiday_work BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE,
  UNIQUE KEY (weekly_report_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci; 