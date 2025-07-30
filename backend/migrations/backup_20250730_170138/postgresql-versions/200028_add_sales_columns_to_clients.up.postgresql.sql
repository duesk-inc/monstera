-- clientsテーブルに営業管理用カラムを追加（PostgreSQL版）

-- ビジネスステータスのENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_status_enum') THEN
        CREATE TYPE business_status_enum AS ENUM ('active', 'inactive', 'suspended');
    END IF;
END $$;

-- 企業規模のENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_size_enum') THEN
        CREATE TYPE company_size_enum AS ENUM ('small', 'medium', 'large', 'enterprise');
    END IF;
END $$;

-- カラムの追加
ALTER TABLE clients 
    ADD COLUMN IF NOT EXISTS primary_sales_rep_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS business_status business_status_enum DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS company_size company_size_enum,
    ADD COLUMN IF NOT EXISTS industry_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS business_start_date DATE,
    ADD COLUMN IF NOT EXISTS last_transaction_date DATE,
    ADD COLUMN IF NOT EXISTS annual_revenue INT,
    ADD COLUMN IF NOT EXISTS website_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS employee_count INT,
    ADD COLUMN IF NOT EXISTS capital_amount BIGINT,
    ADD COLUMN IF NOT EXISTS stock_exchange VARCHAR(50);

-- コメントの追加
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

-- 外部キー制約の追加
ALTER TABLE clients 
    ADD CONSTRAINT fk_clients_sales_rep 
    FOREIGN KEY (primary_sales_rep_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL;

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_clients_sales_rep ON clients(primary_sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_status ON clients(business_status);
CREATE INDEX IF NOT EXISTS idx_clients_industry_type ON clients(industry_type);
CREATE INDEX IF NOT EXISTS idx_clients_business_start ON clients(business_start_date);

-- 既存データの business_status を active に設定
UPDATE clients 
SET business_status = 'active' 
WHERE business_status IS NULL 
  AND deleted_at IS NULL;