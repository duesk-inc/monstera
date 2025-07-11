-- インデックスの削除
DROP INDEX idx_clients_business_start ON clients;
DROP INDEX idx_clients_industry_type ON clients;
DROP INDEX idx_clients_business_status ON clients;
DROP INDEX idx_clients_sales_rep ON clients;

-- 外部キー制約の削除
ALTER TABLE clients DROP FOREIGN KEY fk_clients_sales_rep;

-- カラムの削除
ALTER TABLE clients 
DROP COLUMN primary_sales_rep_id,
DROP COLUMN business_status,
DROP COLUMN company_size,
DROP COLUMN industry_type,
DROP COLUMN business_start_date,
DROP COLUMN last_transaction_date,
DROP COLUMN annual_revenue,
DROP COLUMN website_url,
DROP COLUMN employee_count,
DROP COLUMN capital_amount,
DROP COLUMN stock_exchange;