-- 監査ログテーブル（PostgreSQL版）
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    method VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    path VARCHAR(255) NOT NULL,
    status_code INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_body JSONB,
    response_body JSONB,
    error_message TEXT,
    duration BIGINT, -- マイクロ秒
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- 高セキュリティ: 監査ログは更新不可
    CONSTRAINT audit_logs_no_update CHECK (false) NO INHERIT
);

-- インデックス作成
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;

-- 時系列データ用のBRINインデックス（大量データ対応）
CREATE INDEX idx_audit_logs_created_at_brin ON audit_logs USING brin (created_at);

-- JSONB検索用のGINインデックス（必要に応じて）
CREATE INDEX idx_audit_logs_request_body ON audit_logs USING gin (request_body) WHERE request_body IS NOT NULL;
CREATE INDEX idx_audit_logs_response_body ON audit_logs USING gin (response_body) WHERE response_body IS NOT NULL;

-- 複合インデックス（よく使われるクエリパターン用）
CREATE INDEX idx_audit_logs_user_action_time ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX idx_audit_logs_resource_time ON audit_logs(resource_type, resource_id, created_at DESC) WHERE resource_id IS NOT NULL;

-- 外部キー制約
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- パーティショニング設定（月単位）のコメント
-- 本番環境では以下のようなパーティショニングを検討
-- CREATE TABLE audit_logs (上記の定義) PARTITION BY RANGE (created_at);
-- CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs 
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 監査ログ用の関数とトリガー（オプション）

-- 監査ログ記録関数
CREATE OR REPLACE FUNCTION record_audit_log(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50),
    p_resource_id VARCHAR(100),
    p_method VARCHAR(10),
    p_path VARCHAR(255),
    p_status_code INT,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_body JSONB DEFAULT NULL,
    p_response_body JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_duration BIGINT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id,
        method, path, status_code, ip_address,
        user_agent, request_body, response_body,
        error_message, duration
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_method, p_path, p_status_code, p_ip_address,
        p_user_agent, p_request_body, p_response_body,
        p_error_message, p_duration
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- 監査ログ検索関数（高度な検索用）
CREATE OR REPLACE FUNCTION search_audit_logs(
    p_user_id UUID DEFAULT NULL,
    p_action VARCHAR(100) DEFAULT NULL,
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    action VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    method VARCHAR(10),
    path VARCHAR(255),
    status_code INT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id, al.user_id, al.action, al.resource_type, al.resource_id,
        al.method, al.path, al.status_code, al.ip_address, al.created_at
    FROM audit_logs al
    WHERE 
        (p_user_id IS NULL OR al.user_id = p_user_id)
        AND (p_action IS NULL OR al.action = p_action)
        AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
        AND (p_start_date IS NULL OR al.created_at >= p_start_date)
        AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 監査ログ集計関数
CREATE OR REPLACE FUNCTION audit_log_statistics(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
RETURNS TABLE (
    action VARCHAR(100),
    resource_type VARCHAR(50),
    count BIGINT,
    avg_duration_ms NUMERIC,
    error_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.action,
        al.resource_type,
        COUNT(*)::BIGINT as count,
        ROUND(AVG(al.duration) / 1000.0, 2) as avg_duration_ms,
        COUNT(*) FILTER (WHERE al.status_code >= 400)::BIGINT as error_count
    FROM audit_logs al
    WHERE al.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY al.action, al.resource_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- セキュリティ：監査ログの更新を防ぐトリガー
CREATE OR REPLACE FUNCTION prevent_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs cannot be updated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_log_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_update();

-- Row Level Security（オプション）
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY audit_logs_user_policy ON audit_logs
--     FOR SELECT
--     USING (user_id = current_setting('app.current_user_id')::UUID OR
--            current_setting('app.user_role') = 'admin');

-- コメント追加
COMMENT ON TABLE audit_logs IS '監査ログテーブル：システム内のすべての重要な操作を記録';
COMMENT ON COLUMN audit_logs.id IS '監査ログID';
COMMENT ON COLUMN audit_logs.user_id IS '操作を実行したユーザーID';
COMMENT ON COLUMN audit_logs.action IS 'アクション種別（LOGIN, CREATE, UPDATE等）';
COMMENT ON COLUMN audit_logs.resource_type IS 'リソース種別（USER, WEEKLY_REPORT等）';
COMMENT ON COLUMN audit_logs.resource_id IS '対象リソースのID';
COMMENT ON COLUMN audit_logs.method IS 'HTTPメソッド';
COMMENT ON COLUMN audit_logs.path IS 'リクエストパス';
COMMENT ON COLUMN audit_logs.status_code IS 'HTTPステータスコード';
COMMENT ON COLUMN audit_logs.ip_address IS 'クライアントIPアドレス';
COMMENT ON COLUMN audit_logs.user_agent IS 'ユーザーエージェント';
COMMENT ON COLUMN audit_logs.request_body IS 'リクエストボディ（JSONB形式）';
COMMENT ON COLUMN audit_logs.response_body IS 'レスポンスボディ（JSONB形式）';
COMMENT ON COLUMN audit_logs.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN audit_logs.duration IS '処理時間（マイクロ秒）';
COMMENT ON COLUMN audit_logs.created_at IS '記録日時';