-- Drop triggers
DROP TRIGGER IF EXISTS update_project_assignments_updated_at ON project_assignments;

-- Drop table
DROP TABLE IF EXISTS project_assignments;

-- Drop enum types
DROP TYPE IF EXISTS billing_type_enum;