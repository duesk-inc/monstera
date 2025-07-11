-- Create ENUM type for scan status
CREATE TYPE scan_status_enum AS ENUM ('clean', 'infected', 'error', 'quarantined');

-- ウイルススキャンログテーブル
CREATE TABLE IF NOT EXISTS virus_scan_logs (
    id CHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
    file_id CHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path VARCHAR(500) DEFAULT NULL,
    scan_status scan_status_enum NOT NULL,
    virus_name VARCHAR(255) DEFAULT NULL,
    scan_engine VARCHAR(50) NOT NULL,
    engine_version VARCHAR(50) DEFAULT NULL,
    scan_duration BIGINT NOT NULL,
    error_message TEXT DEFAULT NULL,
    quarantined_at TIMESTAMP(3) DEFAULT NULL,
    user_id CHAR(36) DEFAULT NULL,
    resource_type VARCHAR(50) DEFAULT NULL,
    resource_id CHAR(36) DEFAULT NULL,
    deleted_at TIMESTAMP(3) DEFAULT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Comments on virus_scan_logs columns
COMMENT ON TABLE virus_scan_logs IS 'ウイルススキャンログ';
COMMENT ON COLUMN virus_scan_logs.id IS 'スキャンログID';
COMMENT ON COLUMN virus_scan_logs.file_id IS 'スキャン対象ファイルID';
COMMENT ON COLUMN virus_scan_logs.file_name IS 'ファイル名';
COMMENT ON COLUMN virus_scan_logs.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN virus_scan_logs.file_path IS 'ファイルパス';
COMMENT ON COLUMN virus_scan_logs.scan_status IS 'スキャンステータス';
COMMENT ON COLUMN virus_scan_logs.virus_name IS '検出されたウイルス名';
COMMENT ON COLUMN virus_scan_logs.scan_engine IS '使用したスキャンエンジン';
COMMENT ON COLUMN virus_scan_logs.engine_version IS 'エンジンバージョン';
COMMENT ON COLUMN virus_scan_logs.scan_duration IS 'スキャン時間（ミリ秒）';
COMMENT ON COLUMN virus_scan_logs.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN virus_scan_logs.quarantined_at IS '隔離日時';
COMMENT ON COLUMN virus_scan_logs.user_id IS 'アップロードユーザーID';
COMMENT ON COLUMN virus_scan_logs.resource_type IS 'リソースタイプ（expense_receipt等）';
COMMENT ON COLUMN virus_scan_logs.resource_id IS 'リソースID';
COMMENT ON COLUMN virus_scan_logs.deleted_at IS '削除日時';
COMMENT ON COLUMN virus_scan_logs.created_at IS '作成日時';
COMMENT ON COLUMN virus_scan_logs.updated_at IS '更新日時';

-- Create indexes for virus_scan_logs
CREATE INDEX IF NOT EXISTS idx_file_id ON virus_scan_logs (file_id);
CREATE INDEX IF NOT EXISTS idx_scan_status ON virus_scan_logs (scan_status);
CREATE INDEX IF NOT EXISTS idx_virus_name ON virus_scan_logs (virus_name);
CREATE INDEX IF NOT EXISTS idx_user_id ON virus_scan_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_resource ON virus_scan_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_quarantined_at ON virus_scan_logs (quarantined_at);
CREATE INDEX IF NOT EXISTS idx_created_at ON virus_scan_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_deleted_at ON virus_scan_logs (deleted_at);

-- ウイルススキャン設定テーブル
CREATE TABLE IF NOT EXISTS virus_scan_settings (
    id CHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
    scan_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_quarantine BOOLEAN NOT NULL DEFAULT TRUE,
    max_file_size BIGINT NOT NULL DEFAULT 104857600,
    scan_timeout INT NOT NULL DEFAULT 60,
    quarantine_days INT NOT NULL DEFAULT 30,
    allowed_file_types JSON DEFAULT NULL,
    blocked_file_types JSON DEFAULT NULL,
    notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notification_recipients JSON DEFAULT NULL,
    created_by CHAR(36) NOT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Comments on virus_scan_settings columns
COMMENT ON TABLE virus_scan_settings IS 'ウイルススキャン設定';
COMMENT ON COLUMN virus_scan_settings.id IS '設定ID';
COMMENT ON COLUMN virus_scan_settings.scan_enabled IS 'スキャン有効化フラグ';
COMMENT ON COLUMN virus_scan_settings.auto_quarantine IS '自動隔離有効化フラグ';
COMMENT ON COLUMN virus_scan_settings.max_file_size IS '最大スキャンファイルサイズ（バイト）';
COMMENT ON COLUMN virus_scan_settings.scan_timeout IS 'スキャンタイムアウト（秒）';
COMMENT ON COLUMN virus_scan_settings.quarantine_days IS '隔離ファイル保持日数';
COMMENT ON COLUMN virus_scan_settings.allowed_file_types IS '許可ファイルタイプリスト';
COMMENT ON COLUMN virus_scan_settings.blocked_file_types IS 'ブロックファイルタイプリスト';
COMMENT ON COLUMN virus_scan_settings.notification_enabled IS '通知有効化フラグ';
COMMENT ON COLUMN virus_scan_settings.notification_recipients IS '通知先リスト';
COMMENT ON COLUMN virus_scan_settings.created_by IS '作成者ID';
COMMENT ON COLUMN virus_scan_settings.updated_by IS '更新者ID';
COMMENT ON COLUMN virus_scan_settings.created_at IS '作成日時';
COMMENT ON COLUMN virus_scan_settings.updated_at IS '更新日時';

-- 初期設定データの挿入
INSERT INTO virus_scan_settings (
    scan_enabled,
    auto_quarantine,
    max_file_size,
    scan_timeout,
    quarantine_days,
    allowed_file_types,
    blocked_file_types,
    notification_enabled,
    created_by
) VALUES (
    TRUE,
    TRUE,
    104857600, -- 100MB
    60,
    30,
    '["jpg", "jpeg", "png", "pdf", "doc", "docx", "xls", "xlsx"]'::json,
    '["exe", "bat", "cmd", "scr", "vbs", "js"]'::json,
    TRUE,
    '00000000-0000-0000-0000-000000000000'
);

-- Triggers for automatic timestamp updates

-- Trigger for virus_scan_logs table
DROP TRIGGER IF EXISTS update_virus_scan_logs_updated_at ON virus_scan_logs;
CREATE TRIGGER update_virus_scan_logs_updated_at
    BEFORE UPDATE ON virus_scan_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for virus_scan_settings table
DROP TRIGGER IF EXISTS update_virus_scan_settings_updated_at ON virus_scan_settings;
CREATE TRIGGER update_virus_scan_settings_updated_at
    BEFORE UPDATE ON virus_scan_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();