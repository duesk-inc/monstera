-- E2E Test Seed Data for Monstera (Simple Version)
-- This file contains minimal test data for E2E testing
-- Only creates users and departments (no proposals/questions yet)

-- Clean up existing test data
DELETE FROM user_roles WHERE user_id IN (
    'e2e00001-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000002',
    'e2e00001-0000-0000-0000-000000000003'
);
DELETE FROM users WHERE id IN (
    'e2e00001-0000-0000-0000-000000000001',
    'e2e00001-0000-0000-0000-000000000002',
    'e2e00001-0000-0000-0000-000000000003'
);
DELETE FROM departments WHERE id = 'e2e00003-0000-0000-0000-000000000001';

-- Create test department
INSERT INTO departments (id, name, code, parent_id, is_active, created_at, updated_at)
VALUES (
    'e2e00003-0000-0000-0000-000000000001',
    'E2Eテスト部門',
    'E2E001',
    NULL,
    TRUE,
    NOW(3),
    NOW(3)
);

-- Create test users
-- Password for all test users: Test1234! (bcrypt hashed)
-- Engineer user
INSERT INTO users (
    id, email, password, first_name, last_name, first_name_kana, last_name_kana,
    sei, mei, sei_kana, mei_kana,
    role, department_id, employee_number, engineer_status,
    is_active, created_at, updated_at
) VALUES (
    'e2e00001-0000-0000-0000-000000000001',
    'engineer_test@duesk.co.jp',
    '$2a$10$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', 'エンジニア', 'テスト', 'エンジニア',
    'テスト', 'エンジニア', 'テスト', 'エンジニア',
    4, -- employee role
    'e2e00003-0000-0000-0000-000000000001',
    'E2E001',
    'active',
    TRUE,
    NOW(3),
    NOW(3)
);

-- Sales rep user
INSERT INTO users (
    id, email, password, first_name, last_name, first_name_kana, last_name_kana,
    sei, mei, sei_kana, mei_kana,
    role, department_id, employee_number, engineer_status,
    is_active, created_at, updated_at
) VALUES (
    'e2e00001-0000-0000-0000-000000000002',
    'sales_test@duesk.co.jp',
    '$2a$10$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', '営業', 'テスト', 'エイギョウ',
    'テスト', '営業', 'テスト', 'エイギョウ',
    6, -- sales_rep role
    'e2e00003-0000-0000-0000-000000000001',
    'E2E002',
    'active',
    TRUE,
    NOW(3),
    NOW(3)
);

-- Manager user
INSERT INTO users (
    id, email, password, first_name, last_name, first_name_kana, last_name_kana,
    sei, mei, sei_kana, mei_kana,
    role, department_id, employee_number, engineer_status,
    is_active, created_at, updated_at
) VALUES (
    'e2e00001-0000-0000-0000-000000000003',
    'manager_test@duesk.co.jp',
    '$2a$10$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', 'マネージャー', 'テスト', 'マネージャー',
    'テスト', 'マネージャー', 'テスト', 'マネージャー',
    3, -- manager role
    'e2e00003-0000-0000-0000-000000000001',
    'E2E003',
    'active',
    TRUE,
    NOW(3),
    NOW(3)
);

-- Display summary
SELECT 'E2E test users created successfully!' as message;
SELECT id, email, role FROM users WHERE id LIKE 'e2e%';