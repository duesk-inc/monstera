-- expensesテーブル作成（全カラム統合版）
-- 統合元:
-- - 000010_create_expenses_table.up.postgresql.sql
-- - 200047_add_expense_deadline_fields.up.postgresql.sql  
-- - 200071_add_version_to_expenses.up.postgresql.sql

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  category_id VARCHAR(36),
  amount INT NOT NULL,
  expense_date TIMESTAMP(3) NOT NULL,
  -- statusに'expired'と'closed'を追加
  status VARCHAR(20) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled', 'expired', 'closed')),
  description TEXT,
  receipt_url VARCHAR(255),
  approver_id VARCHAR(36) NULL,
  approved_at TIMESTAMP(3) NULL,
  paid_at TIMESTAMP(3) NULL,
  -- 統合: 200047から期限関連フィールド
  deadline_at TIMESTAMP(3) DEFAULT NULL,
  expired_at TIMESTAMP(3) DEFAULT NULL,
  auto_expire_enabled BOOLEAN DEFAULT TRUE,
  expiry_notification_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP(3) DEFAULT NULL,
  -- 統合: 200071からバージョンフィールド（既に存在）
  version INT DEFAULT 1 NOT NULL,
  created_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_expenses_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_deadline ON expenses(deadline_at);
CREATE INDEX IF NOT EXISTS idx_expenses_expired_at ON expenses(expired_at);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);

-- コメント
COMMENT ON TABLE expenses IS '経費申請';
COMMENT ON COLUMN expenses.status IS 'ステータス（draft:下書き, submitted:提出済み, approved:承認済み, rejected:却下, paid:支払済み, cancelled:取消, expired:期限切れ, closed:締め済み）';
COMMENT ON COLUMN expenses.version IS '楽観的ロック用バージョン番号';
COMMENT ON COLUMN expenses.deadline_at IS '申請期限';
COMMENT ON COLUMN expenses.expired_at IS '期限切れ日時';
COMMENT ON COLUMN expenses.auto_expire_enabled IS '自動期限切れ有効化フラグ';
COMMENT ON COLUMN expenses.expiry_notification_sent IS '期限切れ通知送信済みフラグ';
COMMENT ON COLUMN expenses.reminder_sent_at IS 'リマインダー送信日時';

-- トリガー
CREATE OR REPLACE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 期限管理設定テーブル（200047から移動）
CREATE TABLE IF NOT EXISTS expense_deadline_settings (
    id VARCHAR(36) NOT NULL,
    scope VARCHAR(50) NOT NULL DEFAULT 'global',
    scope_id VARCHAR(36) DEFAULT NULL,
    default_deadline_days INT NOT NULL DEFAULT 30,
    reminder_days_before INT NOT NULL DEFAULT 3,
    auto_expire_enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    PRIMARY KEY (id),
    CONSTRAINT uk_expense_deadline_scope UNIQUE (scope, scope_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_expense_deadline_scope ON expense_deadline_settings(scope, scope_id);

-- コメント
COMMENT ON TABLE expense_deadline_settings IS '経費申請期限設定';
COMMENT ON COLUMN expense_deadline_settings.scope IS 'スコープ（global, department, user）';
COMMENT ON COLUMN expense_deadline_settings.scope_id IS '部門IDまたはユーザーID';
COMMENT ON COLUMN expense_deadline_settings.default_deadline_days IS 'デフォルト期限日数';
COMMENT ON COLUMN expense_deadline_settings.reminder_days_before IS 'リマインダー送信日数（期限の何日前）';
COMMENT ON COLUMN expense_deadline_settings.auto_expire_enabled IS '自動期限切れ有効化';

-- トリガー
DROP TRIGGER IF EXISTS update_expense_deadline_settings_updated_at ON expense_deadline_settings;
CREATE TRIGGER update_expense_deadline_settings_updated_at
    BEFORE UPDATE ON expense_deadline_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();