-- 週報関連テーブルの作成

-- 1. 週報テーブル
CREATE TABLE IF NOT EXISTS weekly_reports (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL, -- Cognito Sub
  year INTEGER NOT NULL,
  week INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  project_progress TEXT NOT NULL,
  achievements TEXT NOT NULL,
  issues TEXT,
  next_week_plan TEXT NOT NULL,
  comments TEXT,
  status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, approved, rejected
  submitted_at TIMESTAMP,
  manager_id VARCHAR(255), -- Cognito Sub
  manager_comment TEXT,
  manager_reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL,
  
  -- 外部キー制約
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(user_id, year, week)
);

-- コメント
COMMENT ON TABLE weekly_reports IS '週報テーブル';
COMMENT ON COLUMN weekly_reports.user_id IS '報告者ID（Cognito Sub）';
COMMENT ON COLUMN weekly_reports.year IS '年';
COMMENT ON COLUMN weekly_reports.week IS '週番号';
COMMENT ON COLUMN weekly_reports.start_date IS '週の開始日';
COMMENT ON COLUMN weekly_reports.end_date IS '週の終了日';
COMMENT ON COLUMN weekly_reports.project_progress IS 'プロジェクト進捗';
COMMENT ON COLUMN weekly_reports.achievements IS '今週の成果';
COMMENT ON COLUMN weekly_reports.issues IS '課題・問題点';
COMMENT ON COLUMN weekly_reports.next_week_plan IS '来週の予定';
COMMENT ON COLUMN weekly_reports.comments IS 'その他コメント';
COMMENT ON COLUMN weekly_reports.status IS 'ステータス';
COMMENT ON COLUMN weekly_reports.submitted_at IS '提出日時';
COMMENT ON COLUMN weekly_reports.manager_id IS '上司ID（Cognito Sub）';
COMMENT ON COLUMN weekly_reports.manager_comment IS '上司コメント';
COMMENT ON COLUMN weekly_reports.manager_reviewed_at IS '上司レビュー日時';

-- インデックス
CREATE INDEX idx_weekly_reports_user_id ON weekly_reports(user_id);
CREATE INDEX idx_weekly_reports_year_week ON weekly_reports(year, week);
CREATE INDEX idx_weekly_reports_status ON weekly_reports(status);
CREATE INDEX idx_weekly_reports_manager_id ON weekly_reports(manager_id);
CREATE INDEX idx_weekly_reports_submitted_at ON weekly_reports(submitted_at);
CREATE INDEX idx_weekly_reports_deleted_at ON weekly_reports(deleted_at);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_weekly_reports_updated_at
    BEFORE UPDATE ON weekly_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. 週報コメントテーブル
CREATE TABLE IF NOT EXISTS weekly_report_comments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  weekly_report_id VARCHAR(36) NOT NULL,
  commented_by VARCHAR(255) NOT NULL, -- Cognito Sub
  comment TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (commented_by) REFERENCES users(id) ON DELETE CASCADE
);

-- コメント
COMMENT ON TABLE weekly_report_comments IS '週報コメントテーブル';
COMMENT ON COLUMN weekly_report_comments.weekly_report_id IS '週報ID';
COMMENT ON COLUMN weekly_report_comments.commented_by IS 'コメント者ID（Cognito Sub）';
COMMENT ON COLUMN weekly_report_comments.comment IS 'コメント内容';
COMMENT ON COLUMN weekly_report_comments.is_private IS '非公開フラグ';

-- インデックス
CREATE INDEX idx_weekly_report_comments_report_id ON weekly_report_comments(weekly_report_id);
CREATE INDEX idx_weekly_report_comments_commented_by ON weekly_report_comments(commented_by);
CREATE INDEX idx_weekly_report_comments_created_at ON weekly_report_comments(created_at DESC);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_weekly_report_comments_updated_at
    BEFORE UPDATE ON weekly_report_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. 週報アーカイブテーブル
CREATE TABLE IF NOT EXISTS weekly_reports_archive (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL, -- Cognito Sub
  year INTEGER NOT NULL,
  week INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  project_progress TEXT NOT NULL,
  achievements TEXT NOT NULL,
  issues TEXT,
  next_week_plan TEXT NOT NULL,
  comments TEXT,
  status VARCHAR(20),
  submitted_at TIMESTAMP,
  manager_id VARCHAR(255), -- Cognito Sub
  manager_comment TEXT,
  manager_reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP,
  archived_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  archived_by VARCHAR(255) NOT NULL, -- Cognito Sub
  
  -- 外部キー制約
  FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- コメント
COMMENT ON TABLE weekly_reports_archive IS '週報アーカイブテーブル';
COMMENT ON COLUMN weekly_reports_archive.archived_at IS 'アーカイブ日時';
COMMENT ON COLUMN weekly_reports_archive.archived_by IS 'アーカイブ実行者ID（Cognito Sub）';

-- インデックス
CREATE INDEX idx_weekly_reports_archive_user_id ON weekly_reports_archive(user_id);
CREATE INDEX idx_weekly_reports_archive_year_week ON weekly_reports_archive(year, week);
CREATE INDEX idx_weekly_reports_archive_archived_at ON weekly_reports_archive(archived_at);

-- 4. 週報テンプレートテーブル
CREATE TABLE IF NOT EXISTS weekly_report_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL, -- Cognito Sub
  name VARCHAR(100) NOT NULL,
  project_progress_template TEXT,
  achievements_template TEXT,
  issues_template TEXT,
  next_week_plan_template TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, is_default) -- ユーザーごとにデフォルトテンプレートは1つのみ
);

-- コメント
COMMENT ON TABLE weekly_report_templates IS '週報テンプレートテーブル';
COMMENT ON COLUMN weekly_report_templates.user_id IS 'ユーザーID（Cognito Sub）';
COMMENT ON COLUMN weekly_report_templates.name IS 'テンプレート名';
COMMENT ON COLUMN weekly_report_templates.is_default IS 'デフォルトテンプレートフラグ';

-- インデックス
CREATE INDEX idx_weekly_report_templates_user_id ON weekly_report_templates(user_id);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_weekly_report_templates_updated_at
    BEFORE UPDATE ON weekly_report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();