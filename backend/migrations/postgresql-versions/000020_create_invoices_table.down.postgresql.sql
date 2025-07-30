-- Drop foreign key constraints
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_project_group;

-- Drop triggers
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;

-- Drop table
DROP TABLE IF EXISTS invoices;

-- Drop enum types
DROP TYPE IF EXISTS invoice_status;
DROP TYPE IF EXISTS freee_sync_status_enum;