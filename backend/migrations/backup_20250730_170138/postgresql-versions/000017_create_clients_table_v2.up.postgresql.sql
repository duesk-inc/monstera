-- clientsテーブル作成（全カラム統合版）
-- 統合元:
-- - 000017_create_clients_table.up.postgresql.sql
-- - 200028_add_sales_columns_to_clients.up.postgresql.sql
-- - 200033_extend_clients_for_accounting.up.postgresql.sql

-- ENUM型の作成
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type') THEN
        CREATE TYPE billing_type AS ENUM ('monthly', 'hourly', 'fixed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_status_enum') THEN
        CREATE TYPE business_status_enum AS ENUM ('active', 'inactive', 'suspended');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_size_enum') THEN
        CREATE TYPE company_size_enum AS ENUM ('small', 'medium', 'large', 'enterprise');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'freee_sync_status_enum') THEN
        CREATE TYPE freee_sync_status_enum AS ENUM ('synced', 'pending', 'failed');
    END IF;
END $$;

-- 取引先管理テーブルの作成
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(36) PRIMARY KEY,
    -- 基本情報
    company_name VARCHAR(200) NOT NULL,
    company_name_kana VARCHAR(200) NOT NULL,
    billing_type billing_type DEFAULT 'monthly',
    payment_terms INT DEFAULT 30,
    contact_person VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    address VARCHAR(255),
    notes TEXT,
    -- 統合: 200028から営業管理用カラム
    primary_sales_rep_id VARCHAR(36),
    business_status business_status_enum DEFAULT 'active',
    company_size company_size_enum,
    industry_type VARCHAR(100),
    business_start_date DATE,
    last_transaction_date DATE,
    annual_revenue INT,
    website_url VARCHAR(255),
    employee_count INT,
    capital_amount BIGINT,
    stock_exchange VARCHAR(50),
    -- 統合: 200033から経理機能用カラム
    billing_closing_day INT DEFAULT 31,
    freee_client_id INT,
    freee_sync_status freee_sync_status_enum DEFAULT 'pending',
    freee_synced_at TIMESTAMP(3),
    -- タイムスタンプ
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP(3) NULL,
    -- 外部キー制約
    CONSTRAINT fk_clients_sales_rep FOREIGN KEY (primary_sales_rep_id) REFERENCES users(id) ON DELETE SET NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_sales_rep ON clients(primary_sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_status ON clients(business_status);
CREATE INDEX IF NOT EXISTS idx_clients_industry_type ON clients(industry_type);
CREATE INDEX IF NOT EXISTS idx_clients_business_start ON clients(business_start_date);
CREATE INDEX IF NOT EXISTS idx_clients_freee_client_id ON clients(freee_client_id);
CREATE INDEX IF NOT EXISTS idx_clients_freee_sync_status ON clients(freee_sync_status);

-- コメント
COMMENT ON TABLE clients IS '取引先管理テーブル';
COMMENT ON COLUMN clients.company_name IS '会社名';
COMMENT ON COLUMN clients.company_name_kana IS '会社名カナ';
COMMENT ON COLUMN clients.billing_type IS '請求タイプ';
COMMENT ON COLUMN clients.payment_terms IS '支払条件（日数）';
COMMENT ON COLUMN clients.contact_person IS '担当者名';
COMMENT ON COLUMN clients.contact_email IS '担当者メール';
COMMENT ON COLUMN clients.contact_phone IS '担当者電話番号';
COMMENT ON COLUMN clients.address IS '住所';
COMMENT ON COLUMN clients.notes IS '備考';
COMMENT ON COLUMN clients.primary_sales_rep_id IS '主担当営業者ID';
COMMENT ON COLUMN clients.business_status IS '取引ステータス';
COMMENT ON COLUMN clients.company_size IS '企業規模';
COMMENT ON COLUMN clients.industry_type IS '業界分類';
COMMENT ON COLUMN clients.business_start_date IS '取引開始日';
COMMENT ON COLUMN clients.last_transaction_date IS '最終取引日';
COMMENT ON COLUMN clients.annual_revenue IS '年間売上（万円）';
COMMENT ON COLUMN clients.website_url IS '企業WebサイトURL';
COMMENT ON COLUMN clients.employee_count IS '従業員数';
COMMENT ON COLUMN clients.capital_amount IS '資本金';
COMMENT ON COLUMN clients.stock_exchange IS '上場取引所';
COMMENT ON COLUMN clients.billing_closing_day IS '請求締め日（1-31、31は月末）';
COMMENT ON COLUMN clients.freee_client_id IS 'freee取引先ID';
COMMENT ON COLUMN clients.freee_sync_status IS 'freee同期ステータス';
COMMENT ON COLUMN clients.freee_synced_at IS 'freee同期日時';

-- トリガー
CREATE OR REPLACE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();