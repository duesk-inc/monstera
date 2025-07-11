-- Test script to verify PostgreSQL conversion

-- Create a test database (run as superuser)
-- CREATE DATABASE test_migration;

-- Test the converted SQL
\c test_migration;

-- First, create a dummy users table for foreign key constraints
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100)
);

-- Run the converted migration file content
\i /Users/daichirouesaka/Documents/90_duesk/monstera/backend/migrations/000002_create_profiles_and_related_tables.up.sql.postgresql

-- Verify the tables were created
\dt

-- Check table structures
\d industries
\d processes

-- Verify data was inserted
SELECT * FROM industries ORDER BY id;
SELECT * FROM processes ORDER BY id;

-- Test auto-increment functionality
INSERT INTO industries (name, display_order) VALUES ('テスト業種', 8);
INSERT INTO processes (name, display_order) VALUES ('テスト工程', 7);

-- Verify new records got auto-generated IDs
SELECT * FROM industries WHERE name = 'テスト業種';
SELECT * FROM processes WHERE name = 'テスト工程';

-- Check sequences
SELECT currval('industries_id_seq');
SELECT currval('processes_id_seq');

-- Cleanup
DROP TABLE work_history_histories CASCADE;
DROP TABLE profile_histories CASCADE;
DROP TABLE business_experiences CASCADE;
DROP TABLE framework_skills CASCADE;
DROP TABLE language_skills CASCADE;
DROP TABLE work_history_technologies CASCADE;
DROP TABLE technology_categories CASCADE;
DROP TABLE work_histories CASCADE;
DROP TABLE profiles CASCADE;
DROP TABLE processes CASCADE;
DROP TABLE industries CASCADE;
DROP TABLE users CASCADE;