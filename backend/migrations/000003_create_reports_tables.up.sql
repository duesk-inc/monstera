-- weekly_reportsテーブル作成（全カラム統合版）
-- 統合元:
-- - 000003_create_reports_tables.up.postgresql.sql
-- - 200010_refactor_weekly_reports_model.up.postgresql.sql

-- WeeklyReports テーブル作成
CREATE TABLE IF NOT EXISTS weekly_reports (
  id VARCHAR(36) PRIMARY KEY,
  -- 基本情報
  user_id VARCHAR(255) NOT NULL,
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
  commented_by VARCHAR(255),
  commented_at TIMESTAMP(3),
  -- 統合: 200010から追加カラム
  department_id VARCHAR(36),
  department_name VARCHAR(100),
  manager_id VARCHAR(255),
  submission_deadline DATE,
  is_late_submission BOOLEAN NOT NULL DEFAULT FALSE,
  revision_count INT NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMP NULL,
  metadata JSONB,
  -- タイムスタンプ
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL,
  -- 外部キー制約
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (commented_by) REFERENCES users(id),
  CONSTRAINT fk_weekly_reports_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  -- チェック制約
  CONSTRAINT chk_weekly_reports_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_weekly_reports_work_hours CHECK (total_work_hours >= 0),
  CONSTRAINT chk_weekly_reports_client_hours CHECK (client_total_work_hours >= 0),
  CONSTRAINT chk_weekly_reports_mood CHECK (mood BETWEEN 1 AND 5),
  CONSTRAINT chk_weekly_reports_revision_count CHECK (revision_count >= 0)
);

-- コメント
COMMENT ON COLUMN weekly_reports.status IS 'ステータス（draft:下書き, submitted:提出済み, approved:承認済み, rejected:却下）';
COMMENT ON COLUMN weekly_reports.client_work_hours IS '顧客向け作業時間';
COMMENT ON COLUMN weekly_reports.manager_comment IS '管理者コメント';
COMMENT ON COLUMN weekly_reports.commented_by IS 'コメント者ID';
COMMENT ON COLUMN weekly_reports.commented_at IS 'コメント日時';
COMMENT ON COLUMN weekly_reports.department_id IS '所属部署ID（提出時点）';
COMMENT ON COLUMN weekly_reports.department_name IS '所属部署名（提出時点）';
COMMENT ON COLUMN weekly_reports.manager_id IS '直属上司ID（提出時点）';
COMMENT ON COLUMN weekly_reports.submission_deadline IS '提出期限';
COMMENT ON COLUMN weekly_reports.is_late_submission IS '遅延提出フラグ';
COMMENT ON COLUMN weekly_reports.revision_count IS '修正回数';
COMMENT ON COLUMN weekly_reports.last_accessed_at IS '最終アクセス日時';
COMMENT ON COLUMN weekly_reports.metadata IS 'メタデータ（拡張用）';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_weekly_reports_commented_at ON weekly_reports (commented_at);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_department ON weekly_reports(department_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_manager ON weekly_reports(manager_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_deadline ON weekly_reports(submission_deadline);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_late_submission ON weekly_reports(is_late_submission, submission_deadline);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_last_accessed ON weekly_reports(last_accessed_at);

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

-- トリガー
CREATE OR REPLACE TRIGGER update_weekly_reports_updated_at
    BEFORE UPDATE ON weekly_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_daily_records_updated_at
    BEFORE UPDATE ON daily_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 提出期限の自動計算関数
CREATE OR REPLACE FUNCTION fn_calculate_submission_deadline(week_end_date DATE)
RETURNS DATE AS $$
BEGIN
    -- 週の終了日（日曜日）の翌日（月曜日）を期限とする
    RETURN week_end_date + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 提出時のデータ自動設定用のトリガー関数
CREATE OR REPLACE FUNCTION update_weekly_reports_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- ステータスが submitted に変更された場合
    IF OLD.status != 'submitted' AND NEW.status = 'submitted' THEN
        -- 提出日時の設定
        IF NEW.submitted_at IS NULL THEN
            NEW.submitted_at := CURRENT_TIMESTAMP;
        END IF;

        -- 遅延提出チェック
        IF NEW.submission_deadline IS NOT NULL AND DATE(NEW.submitted_at) > NEW.submission_deadline THEN
            NEW.is_late_submission := TRUE;
        END IF;

        -- 所属部署情報を提出時点の情報で固定
        IF NEW.department_id IS NULL THEN
            -- departments テーブルが存在する場合のみ実行
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
                SELECT u.department_id, d.name, u.manager_id
                INTO NEW.department_id, NEW.department_name, NEW.manager_id
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.id = NEW.user_id;
            ELSE
                -- departments テーブルがない場合は manager_id のみ設定
                SELECT manager_id INTO NEW.manager_id
                FROM users
                WHERE id = NEW.user_id;
            END IF;
        END IF;
    END IF;

    -- 最終アクセス日時の更新
    NEW.last_accessed_at := CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー
CREATE TRIGGER tr_weekly_reports_submission
    BEFORE UPDATE ON weekly_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_weekly_reports_submission();

-- departments テーブルが存在する場合のみ外部キー制約を追加
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        ALTER TABLE weekly_reports
            ADD CONSTRAINT fk_weekly_reports_department 
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
END $$;