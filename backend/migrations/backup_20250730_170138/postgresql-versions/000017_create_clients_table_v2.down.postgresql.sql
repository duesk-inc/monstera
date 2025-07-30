-- clientsテーブル削除
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
DROP TABLE IF EXISTS clients;

-- ENUM型の削除
DROP TYPE IF EXISTS freee_sync_status_enum;
DROP TYPE IF EXISTS company_size_enum;
DROP TYPE IF EXISTS business_status_enum;
DROP TYPE IF EXISTS billing_type;