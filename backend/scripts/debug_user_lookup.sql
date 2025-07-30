-- Debug user lookup issue
-- Check if user exists with cognito_sub
SELECT 
    id, 
    email, 
    cognito_sub,
    active,
    role,
    created_at,
    updated_at
FROM users 
WHERE cognito_sub = '3826c3d7-989d-4462-bedb-7dcb59b79d16';

-- Check if user exists with email
SELECT 
    id, 
    email, 
    cognito_sub,
    active,
    role,
    created_at,
    updated_at
FROM users 
WHERE email = 'engineer_test@duesk.co.jp';

-- Check for any weird characters or spaces
SELECT 
    id,
    LENGTH(cognito_sub) as cognito_sub_length,
    cognito_sub,
    email
FROM users 
WHERE email = 'engineer_test@duesk.co.jp';