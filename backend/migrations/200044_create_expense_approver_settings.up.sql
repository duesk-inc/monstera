-- 経費申請承認者設定テーブル

-- ENUM型の作成（まだ存在しない場合のみ）
DO $$
BEGIN
    -- approval_type用ENUM（既に存在する可能性があるのでチェック）
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_type_enum') THEN
        CREATE TYPE approval_type_enum AS ENUM ('manager', 'executive');
    END IF;
    -- action用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approver_action_enum') THEN
        CREATE TYPE approver_action_enum AS ENUM ('create', 'update', 'delete');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS expense_approver_settings (
    id VARCHAR(36) PRIMARY KEY,
    approval_type approval_type_enum NOT NULL, -- 承認タイプ
    approver_id VARCHAR(255) NOT NULL, -- 承認者のユーザーID
    is_active BOOLEAN DEFAULT true, -- 有効フラグ
    priority INT DEFAULT 1, -- 優先順位（同じ承認タイプ内での順序）
    created_by VARCHAR(255) NOT NULL, -- 作成者ID
    created_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    CONSTRAINT uk_approver_type UNIQUE (approval_type, approver_id),
    CONSTRAINT fk_approver_settings_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_approver_settings_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
); -- 経費申請承認者設定

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_approval_type_active ON expense_approver_settings(approval_type, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_approver_id ON expense_approver_settings(approver_id);

-- コメントの追加
COMMENT ON TABLE expense_approver_settings IS '経費申請承認者設定';
COMMENT ON COLUMN expense_approver_settings.approval_type IS '承認タイプ';
COMMENT ON COLUMN expense_approver_settings.approver_id IS '承認者のユーザーID';
COMMENT ON COLUMN expense_approver_settings.is_active IS '有効フラグ';
COMMENT ON COLUMN expense_approver_settings.priority IS '優先順位（同じ承認タイプ内での順序）';
COMMENT ON COLUMN expense_approver_settings.created_by IS '作成者ID';

-- 承認者設定履歴テーブル（監査用）
CREATE TABLE IF NOT EXISTS expense_approver_setting_histories (
    id VARCHAR(36) PRIMARY KEY,
    setting_id VARCHAR(36) NOT NULL, -- 設定ID
    approval_type approval_type_enum NOT NULL, -- 承認タイプ
    approver_id VARCHAR(255) NOT NULL, -- 承認者ID
    action approver_action_enum NOT NULL, -- 操作種別
    changed_by VARCHAR(255) NOT NULL, -- 変更者ID
    changed_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'), -- 変更日時
    old_value JSON, -- 変更前の値
    new_value JSON, -- 変更後の値
    CONSTRAINT fk_approver_histories_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
); -- 経費申請承認者設定履歴

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_setting_histories_setting_id ON expense_approver_setting_histories(setting_id);
CREATE INDEX IF NOT EXISTS idx_setting_histories_changed_at ON expense_approver_setting_histories(changed_at);

-- コメントの追加
COMMENT ON TABLE expense_approver_setting_histories IS '経費申請承認者設定履歴';
COMMENT ON COLUMN expense_approver_setting_histories.setting_id IS '設定ID';
COMMENT ON COLUMN expense_approver_setting_histories.approval_type IS '承認タイプ';
COMMENT ON COLUMN expense_approver_setting_histories.approver_id IS '承認者ID';
COMMENT ON COLUMN expense_approver_setting_histories.action IS '操作種別';
COMMENT ON COLUMN expense_approver_setting_histories.changed_by IS '変更者ID';
COMMENT ON COLUMN expense_approver_setting_histories.changed_at IS '変更日時';
COMMENT ON COLUMN expense_approver_setting_histories.old_value IS '変更前の値';
COMMENT ON COLUMN expense_approver_setting_histories.new_value IS '変更後の値';


-- Triggers for automatic timestamp updates

-- Trigger for expense_approver_settings table
DROP TRIGGER IF EXISTS update_expense_approver_settings_updated_at ON expense_approver_settings;
CREATE TRIGGER update_expense_approver_settings_updated_at
    BEFORE UPDATE ON expense_approver_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 注: expense_approver_setting_historiesテーブルには updated_at カラムがないため、トリガーは不要