-- トリガーを削除 DROP TRIGGER IF EXISTS invoice_audit_insert;
DROP TRIGGER IF EXISTS invoice_audit_update;
DROP TRIGGER IF EXISTS invoice_audit_delete;
-- 請求書監査ログテーブル削除 DROP TABLE IF EXISTS invoice_audit_logs;
