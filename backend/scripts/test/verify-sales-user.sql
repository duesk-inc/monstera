-- Verify sales test user setup
-- This script checks the sales user configuration in the database

-- Check user existence and details
SELECT 'Sales User Details:' as info;
SELECT 
    id,
    email,
    CONCAT(first_name, ' ', last_name) as full_name,
    role,
    CASE role
        WHEN 1 THEN 'super_admin'
        WHEN 2 THEN 'admin'
        WHEN 3 THEN 'manager'
        WHEN 4 THEN 'employee'
        WHEN 5 THEN 'sales_manager'
        WHEN 6 THEN 'sales_rep'
        ELSE 'unknown'
    END as role_name,
    active,
    created_at,
    updated_at
FROM users 
WHERE email = 'sales_test@duesk.co.jp'\G

-- Check user_roles table
SELECT 'User Roles Mapping:' as info;
SELECT 
    ur.user_id,
    u.email,
    ur.role,
    ur.created_at
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
WHERE u.email = 'sales_test@duesk.co.jp';

-- Verify password hash (check length to ensure it's a bcrypt hash)
SELECT 'Password Hash Verification:' as info;
SELECT 
    email,
    LENGTH(password) as password_hash_length,
    CASE 
        WHEN password LIKE '$2a$%' THEN 'Valid bcrypt hash'
        ELSE 'Invalid hash format'
    END as hash_status
FROM users 
WHERE email = 'sales_test@duesk.co.jp';

-- Check all test users
SELECT 'All Test Users:' as info;
SELECT 
    email,
    role,
    CASE role
        WHEN 1 THEN 'super_admin'
        WHEN 2 THEN 'admin'
        WHEN 3 THEN 'manager'
        WHEN 4 THEN 'employee'
        WHEN 5 THEN 'sales_manager'
        WHEN 6 THEN 'sales_rep'
        ELSE 'unknown'
    END as role_name,
    active
FROM users 
WHERE email LIKE '%_test@duesk.co.jp'
ORDER BY role;