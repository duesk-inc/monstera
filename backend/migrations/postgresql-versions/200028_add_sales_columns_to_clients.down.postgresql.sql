-- インデックスの削除
DROP INDEX IF EXISTS idx_clients_business_start;
DROP INDEX IF EXISTS idx_clients_industry_type;
DROP INDEX IF EXISTS idx_clients_business_status;
DROP INDEX IF EXISTS idx_clients_sales_rep;

-- 外部キー制約の削除
ALTER TABLE clients 
    DROP CONSTRAINT IF EXISTS fk_clients_sales_rep;

-- カラムの削除
ALTER TABLE clients 
    DROP COLUMN IF EXISTS primary_sales_rep_id,
    DROP COLUMN IF EXISTS business_status,
    DROP COLUMN IF EXISTS company_size,
    DROP COLUMN IF EXISTS industry_type,
    DROP COLUMN IF EXISTS business_start_date,
    DROP COLUMN IF EXISTS last_transaction_date,
    DROP COLUMN IF EXISTS annual_revenue,
    DROP COLUMN IF EXISTS website_url,
    DROP COLUMN IF EXISTS employee_count,
    DROP COLUMN IF EXISTS capital_amount,
    DROP COLUMN IF EXISTS stock_exchange;

-- ENUM型の削除は行いません（他のテーブルで使用される可能性があるため）
-- 必要に応じて手動で削除してください：
-- DROP TYPE IF EXISTS business_status_enum;
-- DROP TYPE IF EXISTS company_size_enum;