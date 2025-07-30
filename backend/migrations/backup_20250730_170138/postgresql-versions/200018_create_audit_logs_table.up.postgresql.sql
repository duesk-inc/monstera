-- audit_logsテーブルの作成（PostgreSQL版）

-- HTTP メソッドのENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_method_enum') THEN
        CREATE TYPE http_method_enum AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    user_id CHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    method http_method_enum NOT NULL,
    path VARCHAR(255) NOT NULL,
    status_code INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_body TEXT,
    response_body TEXT,
    error_message TEXT,
    duration BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- コメントの追加
COMMENT ON TABLE audit_logs IS '監査ログテーブル';
COMMENT ON COLUMN audit_logs.user_id IS 'ユーザーID';
COMMENT ON COLUMN audit_logs.action IS 'アクション';
COMMENT ON COLUMN audit_logs.resource_type IS 'リソースタイプ';
COMMENT ON COLUMN audit_logs.resource_id IS 'リソースID';
COMMENT ON COLUMN audit_logs.method IS 'HTTPメソッド';
COMMENT ON COLUMN audit_logs.path IS 'リクエストパス';
COMMENT ON COLUMN audit_logs.status_code IS 'ステータスコード';
COMMENT ON COLUMN audit_logs.ip_address IS 'IPアドレス';
COMMENT ON COLUMN audit_logs.user_agent IS 'ユーザーエージェント';
COMMENT ON COLUMN audit_logs.request_body IS 'リクエストボディ';
COMMENT ON COLUMN audit_logs.response_body IS 'レスポンスボディ';
COMMENT ON COLUMN audit_logs.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN audit_logs.duration IS '処理時間（ミリ秒）';
COMMENT ON COLUMN audit_logs.created_at IS '作成日時';