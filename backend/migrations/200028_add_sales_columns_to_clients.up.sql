-- clientsテーブルに営業管理用カラムを追加
ALTER TABLE clients 
ADD COLUMN primary_sales_rep_id VARCHAR(36) COMMENT '主担当営業者ID',
ADD COLUMN business_status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' COMMENT '取引ステータス',
ADD COLUMN company_size ENUM('small', 'medium', 'large', 'enterprise') COMMENT '企業規模',
ADD COLUMN industry_type VARCHAR(100) COMMENT '業界分類',
ADD COLUMN business_start_date DATE COMMENT '取引開始日',
ADD COLUMN last_transaction_date DATE COMMENT '最終取引日',
ADD COLUMN annual_revenue INT COMMENT '年間売上（万円）',
ADD COLUMN website_url VARCHAR(255) COMMENT '企業WebサイトURL',
ADD COLUMN employee_count INT COMMENT '従業員数',
ADD COLUMN capital_amount BIGINT COMMENT '資本金',
ADD COLUMN stock_exchange VARCHAR(50) COMMENT '上場取引所';

-- 外部キー制約の追加
ALTER TABLE clients
ADD CONSTRAINT fk_clients_sales_rep FOREIGN KEY (primary_sales_rep_id) 
    REFERENCES users(id) ON DELETE SET NULL;

-- インデックスの追加
CREATE INDEX idx_clients_sales_rep ON clients(primary_sales_rep_id);
CREATE INDEX idx_clients_business_status ON clients(business_status);
CREATE INDEX idx_clients_industry_type ON clients(industry_type);
CREATE INDEX idx_clients_business_start ON clients(business_start_date);

-- 既存データの business_status を active に設定
UPDATE clients SET business_status = 'active' WHERE deleted_at IS NULL;