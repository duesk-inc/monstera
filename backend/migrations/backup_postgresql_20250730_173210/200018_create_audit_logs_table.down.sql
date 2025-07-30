-- 監査ログテーブルの削除

-- トリガー削除
DROP TRIGGER IF EXISTS trigger_prevent_audit_log_update ON audit_logs;

-- 関数削除
DROP FUNCTION IF EXISTS prevent_audit_log_update();
DROP FUNCTION IF EXISTS audit_log_statistics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS search_audit_logs(UUID, VARCHAR(100), VARCHAR(50), TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INT, INT);
DROP FUNCTION IF EXISTS record_audit_log(UUID, VARCHAR(100), VARCHAR(50), VARCHAR(100), VARCHAR(10), VARCHAR(255), INT, VARCHAR(45), TEXT, JSONB, JSONB, TEXT, BIGINT);

-- インデックス削除（テーブル削除時に自動的に削除されるが、明示的に記載）
DROP INDEX IF EXISTS idx_audit_logs_resource_time;
DROP INDEX IF EXISTS idx_audit_logs_user_action_time;
DROP INDEX IF EXISTS idx_audit_logs_response_body;
DROP INDEX IF EXISTS idx_audit_logs_request_body;
DROP INDEX IF EXISTS idx_audit_logs_created_at_brin;
DROP INDEX IF EXISTS idx_audit_logs_ip_address;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_resource_id;
DROP INDEX IF EXISTS idx_audit_logs_resource_type;
DROP INDEX IF EXISTS idx_audit_logs_user_id;

-- テーブル削除
DROP TABLE IF EXISTS audit_logs;