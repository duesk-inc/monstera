-- 延長確認管理テーブル（PostgreSQL版）

-- 契約延長ステータスのENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_extension_status_enum') THEN
        CREATE TYPE contract_extension_status_enum AS ENUM (
            'pending',    -- 未確認
            'requested',  -- 継続依頼
            'approved',   -- 承諾済
            'leaving'     -- 退場
        );
    END IF;
END $$;

-- 延長確認管理テーブル
CREATE TABLE IF NOT EXISTS contract_extensions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    engineer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(36), -- 現在参画中の案件
    
    -- 契約情報
    current_contract_end_date DATE NOT NULL,
    extension_check_date DATE NOT NULL, -- 確認実施日
    
    -- 確認状況
    status contract_extension_status_enum NOT NULL DEFAULT 'pending',
    
    -- 確認内容
    extension_request_date DATE,
    client_response_date DATE,
    extension_period_months INT,
    new_contract_end_date DATE,
    
    -- 備考
    notes TEXT,
    
    -- 共通カラム
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP NULL,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    -- 外部キー制約
    CONSTRAINT fk_contract_extensions_engineer FOREIGN KEY (engineer_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- インデックス
CREATE INDEX idx_extensions_engineer ON contract_extensions(engineer_id);
CREATE INDEX idx_extensions_status ON contract_extensions(status);
CREATE INDEX idx_extensions_check_date ON contract_extensions(extension_check_date);
CREATE INDEX idx_extensions_contract_end ON contract_extensions(current_contract_end_date);
CREATE INDEX idx_extensions_deleted ON contract_extensions(deleted_at);

-- 複合インデックス（効率的な抽出用）
CREATE INDEX idx_extensions_check_composite ON contract_extensions(current_contract_end_date, status) 
WHERE deleted_at IS NULL;

-- 契約延長設定テーブル（グローバル設定）
CREATE TABLE IF NOT EXISTS contract_extension_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    check_before_days INT NOT NULL DEFAULT 30, -- 契約終了何日前から確認対象とするか
    reminder_enabled BOOLEAN DEFAULT TRUE,
    reminder_days JSONB, -- リマインダー送信日数の配列 [7, 3, 1]
    auto_notification BOOLEAN DEFAULT TRUE,
    notification_channels JSONB, -- 通知チャンネル ['email', 'slack']
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- デフォルト設定の挿入
INSERT INTO contract_extension_settings (
    id,
    check_before_days,
    reminder_enabled,
    reminder_days,
    auto_notification,
    notification_channels
) VALUES (
    gen_random_uuid()::text,
    30,
    TRUE,
    '[7, 3, 1]'::jsonb,
    TRUE,
    '["email", "slack"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- トリガー関数が存在しない場合は作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates

-- Trigger for contract_extensions table
CREATE TRIGGER update_contract_extensions_updated_at
    BEFORE UPDATE ON contract_extensions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for contract_extension_settings table
CREATE TRIGGER update_contract_extension_settings_updated_at
    BEFORE UPDATE ON contract_extension_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE contract_extensions IS '延長確認管理テーブル';
COMMENT ON COLUMN contract_extensions.engineer_id IS 'エンジニアID';
COMMENT ON COLUMN contract_extensions.project_id IS '現在参画中の案件';
COMMENT ON COLUMN contract_extensions.current_contract_end_date IS '現在の契約終了日';
COMMENT ON COLUMN contract_extensions.extension_check_date IS '確認実施日';
COMMENT ON COLUMN contract_extensions.status IS '確認状況';
COMMENT ON COLUMN contract_extensions.extension_request_date IS '延長依頼日';
COMMENT ON COLUMN contract_extensions.client_response_date IS 'クライアント回答日';
COMMENT ON COLUMN contract_extensions.extension_period_months IS '延長期間（月）';
COMMENT ON COLUMN contract_extensions.new_contract_end_date IS '新契約終了日';
COMMENT ON COLUMN contract_extensions.notes IS '備考';

COMMENT ON TABLE contract_extension_settings IS '契約延長設定テーブル（グローバル設定）';
COMMENT ON COLUMN contract_extension_settings.check_before_days IS '契約終了何日前から確認対象とするか';
COMMENT ON COLUMN contract_extension_settings.reminder_enabled IS 'リマインダー有効フラグ';
COMMENT ON COLUMN contract_extension_settings.reminder_days IS 'リマインダー送信日数の配列';
COMMENT ON COLUMN contract_extension_settings.auto_notification IS '自動通知有効フラグ';
COMMENT ON COLUMN contract_extension_settings.notification_channels IS '通知チャンネル';