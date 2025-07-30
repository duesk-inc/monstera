-- 請求書監査ログテーブル作成（PostgreSQL版）
CREATE TABLE IF NOT EXISTS invoice_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'freee_synced')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    freee_invoice_id INT,
    notes TEXT
);

-- インデックス作成
CREATE INDEX idx_invoice_audit_logs_invoice_id ON invoice_audit_logs(invoice_id);
CREATE INDEX idx_invoice_audit_logs_action ON invoice_audit_logs(action);
CREATE INDEX idx_invoice_audit_logs_changed_at ON invoice_audit_logs(changed_at DESC);
CREATE INDEX idx_invoice_audit_logs_changed_by ON invoice_audit_logs(changed_by) WHERE changed_by IS NOT NULL;

-- 外部キー制約
ALTER TABLE invoice_audit_logs ADD CONSTRAINT fk_invoice_audit_logs_invoice 
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
ALTER TABLE invoice_audit_logs ADD CONSTRAINT fk_invoice_audit_logs_user 
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;

-- コメント追加
COMMENT ON TABLE invoice_audit_logs IS '請求書監査ログ';
COMMENT ON COLUMN invoice_audit_logs.id IS '監査ログID';
COMMENT ON COLUMN invoice_audit_logs.invoice_id IS '請求書ID';
COMMENT ON COLUMN invoice_audit_logs.action IS 'アクション';
COMMENT ON COLUMN invoice_audit_logs.old_values IS '変更前データ';
COMMENT ON COLUMN invoice_audit_logs.new_values IS '変更後データ';
COMMENT ON COLUMN invoice_audit_logs.changed_by IS '変更者ID';
COMMENT ON COLUMN invoice_audit_logs.changed_at IS '変更日時';
COMMENT ON COLUMN invoice_audit_logs.freee_invoice_id IS 'freee請求書ID';
COMMENT ON COLUMN invoice_audit_logs.notes IS '備考';

-- 請求書監査ログ記録関数
CREATE OR REPLACE FUNCTION audit_invoice_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO invoice_audit_logs (
            invoice_id, action, new_values, changed_by, changed_at, freee_invoice_id
        ) VALUES (
            NEW.id,
            'created',
            jsonb_build_object(
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
    ELSIF TG_OP = 'UPDATE' THEN
        -- アクションの判定
        DECLARE
            v_action VARCHAR(20);
        BEGIN
            IF OLD.status != NEW.status THEN
                v_action := 'status_changed';
            ELSIF OLD.freee_sync_status != NEW.freee_sync_status AND NEW.freee_sync_status = 'synced' THEN
                v_action := 'freee_synced';
            ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
                v_action := 'deleted';
            ELSE
                v_action := 'updated';
            END IF;
            
            -- 削除の場合は別処理
            IF v_action = 'deleted' THEN
                INSERT INTO invoice_audit_logs (
                    invoice_id, action, old_values, changed_by, changed_at, freee_invoice_id
                ) VALUES (
                    NEW.id,
                    'deleted',
                    jsonb_build_object(
                        'invoice_number', OLD.invoice_number,
                        'client_id', OLD.client_id,
                        'total_amount', OLD.total_amount,
                        'status', OLD.status,
                        'deleted_at', NEW.deleted_at
                    ),
                    NEW.created_by, -- または削除実行者のID
                    NEW.deleted_at,
                    OLD.freee_invoice_id
                );
            ELSE
                -- 通常の更新
                INSERT INTO invoice_audit_logs (
                    invoice_id, action, old_values, new_values, changed_by, changed_at, freee_invoice_id
                ) VALUES (
                    NEW.id,
                    v_action,
                    jsonb_build_object(
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
                    jsonb_build_object(
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
                    NEW.created_by, -- または更新実行者のID
                    CURRENT_TIMESTAMP,
                    NEW.freee_invoice_id
                );
            END IF;
        END;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
CREATE TRIGGER trigger_invoice_audit_insert
    AFTER INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_invoice_changes();

CREATE TRIGGER trigger_invoice_audit_update
    AFTER UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_invoice_changes();

-- 請求書監査ログ検索関数
CREATE OR REPLACE FUNCTION search_invoice_audit_logs(
    p_invoice_id UUID DEFAULT NULL,
    p_action VARCHAR(20) DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INT DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    invoice_id UUID,
    action VARCHAR(20),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE,
    freee_invoice_id INT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ial.id, ial.invoice_id, ial.action, ial.old_values, ial.new_values,
        ial.changed_by, ial.changed_at, ial.freee_invoice_id, ial.notes
    FROM invoice_audit_logs ial
    WHERE 
        (p_invoice_id IS NULL OR ial.invoice_id = p_invoice_id)
        AND (p_action IS NULL OR ial.action = p_action)
        AND (p_changed_by IS NULL OR ial.changed_by = p_changed_by)
        AND (p_start_date IS NULL OR ial.changed_at >= p_start_date)
        AND (p_end_date IS NULL OR ial.changed_at <= p_end_date)
    ORDER BY ial.changed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 請求書変更履歴取得関数
CREATE OR REPLACE FUNCTION get_invoice_change_history(p_invoice_id UUID)
RETURNS TABLE (
    action VARCHAR(20),
    changed_at TIMESTAMP WITH TIME ZONE,
    changed_by_name VARCHAR(100),
    changes JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ial.action,
        ial.changed_at,
        u.name as changed_by_name,
        CASE 
            WHEN ial.old_values IS NOT NULL AND ial.new_values IS NOT NULL THEN
                jsonb_build_object(
                    'old', ial.old_values,
                    'new', ial.new_values,
                    'diff', (
                        SELECT jsonb_object_agg(key, jsonb_build_object('old', ial.old_values->key, 'new', ial.new_values->key))
                        FROM jsonb_object_keys(ial.old_values) AS key
                        WHERE ial.old_values->key IS DISTINCT FROM ial.new_values->key
                    )
                )
            WHEN ial.new_values IS NOT NULL THEN
                jsonb_build_object('new', ial.new_values)
            WHEN ial.old_values IS NOT NULL THEN
                jsonb_build_object('old', ial.old_values)
            ELSE NULL
        END as changes
    FROM invoice_audit_logs ial
    LEFT JOIN users u ON ial.changed_by = u.id
    WHERE ial.invoice_id = p_invoice_id
    ORDER BY ial.changed_at DESC;
END;
$$ LANGUAGE plpgsql;