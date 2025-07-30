-- 請求書監査ログテーブル削除

-- トリガー削除
DROP TRIGGER IF EXISTS trigger_invoice_audit_update ON invoices;
DROP TRIGGER IF EXISTS trigger_invoice_audit_insert ON invoices;

-- 関数削除
DROP FUNCTION IF EXISTS get_invoice_change_history(UUID);
DROP FUNCTION IF EXISTS search_invoice_audit_logs(UUID, VARCHAR(20), UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INT);
DROP FUNCTION IF EXISTS audit_invoice_changes();

-- インデックス削除（テーブル削除時に自動的に削除されるが、明示的に記載）
DROP INDEX IF EXISTS idx_invoice_audit_logs_changed_by;
DROP INDEX IF EXISTS idx_invoice_audit_logs_changed_at;
DROP INDEX IF EXISTS idx_invoice_audit_logs_action;
DROP INDEX IF EXISTS idx_invoice_audit_logs_invoice_id;

-- テーブル削除
DROP TABLE IF EXISTS invoice_audit_logs;