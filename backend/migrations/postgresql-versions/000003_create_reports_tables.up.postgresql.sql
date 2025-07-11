-- WeeklyReports テーブル作成
CREATE TABLE IF NOT EXISTS weekly_reports (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  mood INT NOT NULL DEFAULT 3,
  weekly_remarks TEXT,
  workplace_name VARCHAR(100),
  workplace_hours VARCHAR(100),
  workplace_change_requested BOOLEAN DEFAULT FALSE,
  total_work_hours DECIMAL(5,2),
  client_total_work_hours DECIMAL(5,2) DEFAULT 0,
  client_work_hours DECIMAL(5,2) DEFAULT 0,
  submitted_at TIMESTAMP NULL,
  manager_comment TEXT,
  commented_by VARCHAR(36),
  commented_at TIMESTAMP(3),
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (commented_by) REFERENCES users(id)
);

-- PostgreSQL用のコメント設定
COMMENT ON COLUMN weekly_reports.status IS 'ステータス（draft:下書き, submitted:提出済み, approved:承認済み, rejected:却下）';
COMMENT ON COLUMN weekly_reports.client_work_hours IS '顧客向け作業時間';
COMMENT ON COLUMN weekly_reports.manager_comment IS '管理者コメント';
COMMENT ON COLUMN weekly_reports.commented_by IS 'コメント者ID';
COMMENT ON COLUMN weekly_reports.commented_at IS 'コメント日時';

-- インデックスの作成
CREATE INDEX idx_weekly_reports_commented_at ON weekly_reports (commented_at);

-- DailyRecords テーブル作成
CREATE TABLE IF NOT EXISTS daily_records (
  id VARCHAR(36) PRIMARY KEY,
  weekly_report_id VARCHAR(36) NOT NULL,
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
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE,
  UNIQUE (weekly_report_id, date)
);

-- Triggers for automatic timestamp updates
-- Trigger for weekly_reports table
CREATE OR REPLACE TRIGGER update_weekly_reports_updated_at
    BEFORE UPDATE ON weekly_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for daily_records table
CREATE OR REPLACE TRIGGER update_daily_records_updated_at
    BEFORE UPDATE ON daily_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();