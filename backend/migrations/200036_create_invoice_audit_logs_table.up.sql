-- ENUM型の作成
DO $$
BEGIN
    -- action用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_audit_action') THEN
        CREATE TYPE invoice_audit_action AS ENUM ('created', 'updated', 'deleted', 'status_changed', 'freee_synced');
    END IF;
END$$;

-- 請求書監査ログテーブル作成
CREATE TABLE IF NOT EXISTS invoice_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL, -- 請求書ID
    action invoice_audit_action NOT NULL, -- アクション
    old_values JSON, -- 変更前データ
    new_values JSON, -- 変更後データ
    changed_by VARCHAR(255), -- 変更者ID
    changed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), -- 変更日時
    freee_invoice_id INT, -- freee請求書ID
    notes TEXT, -- 備考
    CONSTRAINT fk_invoice_audit_logs_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_audit_logs_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
); -- 請求書監査ログ

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_invoice_id ON invoice_audit_logs (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_action ON invoice_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_changed_at ON invoice_audit_logs (changed_at);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_changed_by ON invoice_audit_logs (changed_by);

-- 請求書作成時のトリガー関数
CREATE OR REPLACE FUNCTION invoice_audit_insert_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO invoice_audit_logs (
        id,
        invoice_id,
        action,
        new_values,
        changed_by,
        changed_at,
        freee_invoice_id
    ) VALUES (
        gen_random_uuid()::VARCHAR,
        NEW.id,
        'created',
        json_build_object(
            'invoice_number', NEW.invoice_number,
            'client_id', NEW.client_id,
            'invoice_date', NEW.invoice_date,
            'due_date', NEW.due_date,
            'billing_month', NEW.billing_month,
            'total_amount', NEW.total_amount,
            'status', NEW.status,
            'project_group_id', NEW.project_group_id,
            'freee_sync_status', NEW.freee_sync_status
        ),
        NEW.created_by,
        NEW.created_at,
        NEW.freee_invoice_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 請求書更新時のトリガー関数
CREATE OR REPLACE FUNCTION invoice_audit_update_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO invoice_audit_logs (
        id,
        invoice_id,
        action,
        old_values,
        new_values,
        changed_by,
        changed_at,
        freee_invoice_id
    ) VALUES (
        gen_random_uuid()::VARCHAR,
        NEW.id,
        CASE
            WHEN OLD.status != NEW.status THEN 'status_changed'
            WHEN OLD.freee_sync_status != NEW.freee_sync_status AND NEW.freee_sync_status = 'synced' THEN 'freee_synced'
            ELSE 'updated'
        END,
        json_build_object(
            'invoice_number', OLD.invoice_number,
            'client_id', OLD.client_id,
            'invoice_date', OLD.invoice_date,
            'due_date', OLD.due_date,
            'billing_month', OLD.billing_month,
            'total_amount', OLD.total_amount,
            'status', OLD.status,
            'project_group_id', OLD.project_group_id,
            'freee_sync_status', OLD.freee_sync_status,
            'freee_invoice_id', OLD.freee_invoice_id
        ),
        json_build_object(
            'invoice_number', NEW.invoice_number,
            'client_id', NEW.client_id,
            'invoice_date', NEW.invoice_date,
            'due_date', NEW.due_date,
            'billing_month', NEW.billing_month,
            'total_amount', NEW.total_amount,
            'status', NEW.status,
            'project_group_id', NEW.project_group_id,
            'freee_sync_status', NEW.freee_sync_status,
            'freee_invoice_id', NEW.freee_invoice_id
        ),
        NEW.created_by,
        NOW(),
        NEW.freee_invoice_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 請求書削除時のトリガー関数（論理削除）
CREATE OR REPLACE FUNCTION invoice_audit_delete_func()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        INSERT INTO invoice_audit_logs (
            id,
            invoice_id,
            action,
            old_values,
            changed_by,
            changed_at,
            freee_invoice_id
        ) VALUES (
            gen_random_uuid()::VARCHAR,
            NEW.id,
            'deleted',
            json_build_object(
                'invoice_number', OLD.invoice_number,
                'client_id', OLD.client_id,
                'total_amount', OLD.total_amount,
                'status', OLD.status,
                'deleted_at', NEW.deleted_at
            ),
            NEW.created_by,
            NEW.deleted_at,
            OLD.freee_invoice_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS invoice_audit_insert ON invoices;
CREATE TRIGGER invoice_audit_insert
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION invoice_audit_insert_func();

DROP TRIGGER IF EXISTS invoice_audit_update ON invoices;
CREATE TRIGGER invoice_audit_update
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION invoice_audit_update_func();

DROP TRIGGER IF EXISTS invoice_audit_delete ON invoices;
CREATE TRIGGER invoice_audit_delete
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION invoice_audit_delete_func();
