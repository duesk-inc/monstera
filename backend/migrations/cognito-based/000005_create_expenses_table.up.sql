-- 経費申請関連テーブルの作成

-- 1. 経費申請テーブル
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL, -- Cognito Sub
  expense_date DATE NOT NULL,
  amount INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  receipt_url VARCHAR(500),
  status approval_status NOT NULL DEFAULT 'pending',
  approver_id VARCHAR(255), -- Cognito Sub
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  -- 追加フィールド（統合版）
  deadline DATE,
  is_deadline_notified BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL,
  
  -- 外部キー制約
  CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_expenses_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- コメント
COMMENT ON TABLE expenses IS '経費申請テーブル';
COMMENT ON COLUMN expenses.user_id IS '申請者ID（Cognito Sub）';
COMMENT ON COLUMN expenses.amount IS '金額（円）';
COMMENT ON COLUMN expenses.category IS 'カテゴリー（交通費、会議費等）';
COMMENT ON COLUMN expenses.receipt_url IS '領収書URL';
COMMENT ON COLUMN expenses.status IS '承認ステータス';
COMMENT ON COLUMN expenses.approver_id IS '承認者ID（Cognito Sub）';
COMMENT ON COLUMN expenses.approved_at IS '承認日時';
COMMENT ON COLUMN expenses.rejection_reason IS '却下理由';
COMMENT ON COLUMN expenses.deadline IS '提出期限';
COMMENT ON COLUMN expenses.is_deadline_notified IS '期限通知済みフラグ';
COMMENT ON COLUMN expenses.version IS 'バージョン番号（楽観的ロック用）';

-- インデックス
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_approver_id ON expenses(approver_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_deadline ON expenses(deadline);
CREATE INDEX idx_expenses_deleted_at ON expenses(deleted_at);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. 経費申請下書きテーブル
CREATE TABLE IF NOT EXISTS expense_drafts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL, -- Cognito Sub
  expense_date DATE,
  amount INTEGER,
  category VARCHAR(50),
  description TEXT,
  receipt_url VARCHAR(500),
  draft_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  CONSTRAINT fk_expense_drafts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- コメント
COMMENT ON TABLE expense_drafts IS '経費申請下書きテーブル';
COMMENT ON COLUMN expense_drafts.user_id IS 'ユーザーID（Cognito Sub）';
COMMENT ON COLUMN expense_drafts.draft_data IS '下書きデータ（JSON形式）';

-- インデックス
CREATE INDEX idx_expense_drafts_user_id ON expense_drafts(user_id);
CREATE INDEX idx_expense_drafts_updated_at ON expense_drafts(updated_at DESC);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_expense_drafts_updated_at
    BEFORE UPDATE ON expense_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. 経費承認履歴テーブル
CREATE TABLE IF NOT EXISTS expense_approvals (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  expense_id VARCHAR(36) NOT NULL,
  approver_id VARCHAR(255) NOT NULL, -- Cognito Sub
  action VARCHAR(20) NOT NULL, -- approve, reject, request_change
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  CONSTRAINT fk_expense_approvals_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_expense_approvals_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- コメント
COMMENT ON TABLE expense_approvals IS '経費承認履歴テーブル';
COMMENT ON COLUMN expense_approvals.expense_id IS '経費申請ID';
COMMENT ON COLUMN expense_approvals.approver_id IS '承認者ID（Cognito Sub）';
COMMENT ON COLUMN expense_approvals.action IS 'アクション（承認、却下、修正依頼）';

-- インデックス
CREATE INDEX idx_expense_approvals_expense_id ON expense_approvals(expense_id);
CREATE INDEX idx_expense_approvals_approver_id ON expense_approvals(approver_id);
CREATE INDEX idx_expense_approvals_created_at ON expense_approvals(created_at DESC);

-- 4. 経費上限設定テーブル
CREATE TABLE IF NOT EXISTS expense_limits (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category VARCHAR(50) NOT NULL,
  monthly_limit INTEGER NOT NULL,
  yearly_limit INTEGER,
  scope VARCHAR(20) DEFAULT 'company', -- company, department, user
  scope_id VARCHAR(255), -- 部署IDまたはユーザーID（Cognito Sub）
  created_by VARCHAR(255) NOT NULL, -- Cognito Sub
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  CONSTRAINT fk_expense_limits_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE(category, scope, scope_id)
);

-- コメント
COMMENT ON TABLE expense_limits IS '経費上限設定テーブル';
COMMENT ON COLUMN expense_limits.category IS 'カテゴリー';
COMMENT ON COLUMN expense_limits.monthly_limit IS '月次上限額';
COMMENT ON COLUMN expense_limits.yearly_limit IS '年次上限額';
COMMENT ON COLUMN expense_limits.scope IS '適用範囲（全社、部署、個人）';
COMMENT ON COLUMN expense_limits.scope_id IS '適用対象ID';
COMMENT ON COLUMN expense_limits.created_by IS '作成者ID（Cognito Sub）';

-- インデックス
CREATE INDEX idx_expense_limits_category ON expense_limits(category);
CREATE INDEX idx_expense_limits_scope ON expense_limits(scope, scope_id);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_expense_limits_updated_at
    BEFORE UPDATE ON expense_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 経費集計テーブル
CREATE TABLE IF NOT EXISTS expense_summaries (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL, -- Cognito Sub
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  expense_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  
  -- 外部キー制約
  CONSTRAINT fk_expense_summaries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE(user_id, year, month, category)
);

-- コメント
COMMENT ON TABLE expense_summaries IS '経費集計テーブル';
COMMENT ON COLUMN expense_summaries.user_id IS 'ユーザーID（Cognito Sub）';
COMMENT ON COLUMN expense_summaries.year IS '年';
COMMENT ON COLUMN expense_summaries.month IS '月';
COMMENT ON COLUMN expense_summaries.category IS 'カテゴリー';
COMMENT ON COLUMN expense_summaries.total_amount IS '合計金額';
COMMENT ON COLUMN expense_summaries.expense_count IS '件数';

-- インデックス
CREATE INDEX idx_expense_summaries_user_period ON expense_summaries(user_id, year, month);
CREATE INDEX idx_expense_summaries_category ON expense_summaries(category);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_expense_summaries_updated_at
    BEFORE UPDATE ON expense_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();