-- Create billing_type enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type') THEN
        CREATE TYPE billing_type AS ENUM ('monthly', 'hourly', 'fixed');
    END IF;
END $$;

-- 取引先管理テーブルの作成
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(36) PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL, -- 会社名
    company_name_kana VARCHAR(200) NOT NULL, -- 会社名カナ
    billing_type billing_type DEFAULT 'monthly', -- 請求タイプ
    payment_terms INT DEFAULT 30, -- 支払条件（日数）
    contact_person VARCHAR(100), -- 担当者名
    contact_email VARCHAR(100), -- 担当者メール
    contact_phone VARCHAR(20), -- 担当者電話番号
    address VARCHAR(255), -- 住所
    notes TEXT, -- 備考
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL -- 削除日時
);

-- Index
CREATE INDEX idx_clients_company_name ON clients(company_name);

-- Table comment
COMMENT ON TABLE clients IS '取引先管理テーブル';


-- Triggers for automatic timestamp updates

-- Trigger for clients table
CREATE OR REPLACE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
