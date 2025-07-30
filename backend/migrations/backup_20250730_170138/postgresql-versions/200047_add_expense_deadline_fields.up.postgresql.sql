-- 経費申請ステータスCHECK制約の更新（期限切れステータスを追加）
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_status_check 
    CHECK (status::text = ANY (ARRAY['draft'::character varying, 'submitted'::character varying, 'approved'::character varying, 'rejected'::character varying, 'paid'::character varying, 'cancelled'::character varying, 'expired'::character varying]::text[]));

-- 経費申請に期限関連フィールドを追加
ALTER TABLE expenses 
    ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP(3) DEFAULT NULL, -- 申請期限
    ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP(3) DEFAULT NULL, -- 期限切れ日時
    ADD COLUMN IF NOT EXISTS auto_expire_enabled BOOLEAN DEFAULT TRUE, -- 自動期限切れ有効化フラグ
    ADD COLUMN IF NOT EXISTS expiry_notification_sent BOOLEAN DEFAULT FALSE, -- 期限切れ通知送信済みフラグ
    ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP(3) DEFAULT NULL; -- リマインダー送信日時

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_expenses_deadline ON expenses(deadline_at);
CREATE INDEX IF NOT EXISTS idx_expenses_expired_at ON expenses(expired_at);

-- コメントの追加
COMMENT ON COLUMN expenses.deadline_at IS '申請期限';
COMMENT ON COLUMN expenses.expired_at IS '期限切れ日時';
COMMENT ON COLUMN expenses.auto_expire_enabled IS '自動期限切れ有効化フラグ';
COMMENT ON COLUMN expenses.expiry_notification_sent IS '期限切れ通知送信済みフラグ';
COMMENT ON COLUMN expenses.reminder_sent_at IS 'リマインダー送信日時';

-- 既存の申請中データに期限を設定（申請日から30日後）
UPDATE expenses 
SET deadline_at = created_at + INTERVAL '30 days'
WHERE status = 'submitted' 
  AND deadline_at IS NULL;

-- 期限管理設定テーブルを作成
CREATE TABLE IF NOT EXISTS expense_deadline_settings (
    id VARCHAR(36) NOT NULL,
    scope VARCHAR(50) NOT NULL DEFAULT 'global', -- スコープ（global, department, user）
    scope_id VARCHAR(36) DEFAULT NULL, -- 部門IDまたはユーザーID
    default_deadline_days INT NOT NULL DEFAULT 30, -- デフォルト期限日数
    reminder_days_before INT NOT NULL DEFAULT 3, -- リマインダー送信日数（期限の何日前）
    auto_expire_enabled BOOLEAN DEFAULT TRUE, -- 自動期限切れ有効化
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    PRIMARY KEY (id),
    CONSTRAINT uk_expense_deadline_scope UNIQUE (scope, scope_id)
); -- 経費申請期限設定

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_expense_deadline_scope ON expense_deadline_settings(scope, scope_id);

-- コメントの追加
COMMENT ON TABLE expense_deadline_settings IS '経費申請期限設定';
COMMENT ON COLUMN expense_deadline_settings.scope IS 'スコープ（global, department, user）';
COMMENT ON COLUMN expense_deadline_settings.scope_id IS '部門IDまたはユーザーID';
COMMENT ON COLUMN expense_deadline_settings.default_deadline_days IS 'デフォルト期限日数';
COMMENT ON COLUMN expense_deadline_settings.reminder_days_before IS 'リマインダー送信日数（期限の何日前）';
COMMENT ON COLUMN expense_deadline_settings.auto_expire_enabled IS '自動期限切れ有効化';

-- デフォルトの期限設定を追加
INSERT INTO expense_deadline_settings (
    id,
    scope,
    scope_id,
    default_deadline_days,
    reminder_days_before,
    auto_expire_enabled,
    created_by
) VALUES (
    gen_random_uuid()::text,
    'global',
    NULL,
    30,
    3,
    TRUE,
    '00000000-0000-0000-0000-000000000000'
) ON CONFLICT DO NOTHING;


-- Triggers for automatic timestamp updates

-- Trigger for expense_deadline_settings table
DROP TRIGGER IF EXISTS update_expense_deadline_settings_updated_at ON expense_deadline_settings;
CREATE TRIGGER update_expense_deadline_settings_updated_at
    BEFORE UPDATE ON expense_deadline_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();