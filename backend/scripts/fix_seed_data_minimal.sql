-- Minimal fix for Cognito-DB sync issue
-- 2025-07-30

-- 1. Add missing users
INSERT INTO users (id, email, password, first_name, last_name, first_name_kana, last_name_kana, phone_number, role, active, created_at, updated_at) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'daichiro.uesaka@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', '大地郎', '上坂', 'ダイチロウ', 'ウエサカ', '080-4555-5678', 2, true, NOW(), NOW()),
('3bb73c7d-4086-4304-a918-3d871c98ddc9', 'admin@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', '管理者', 'システム', 'カンリシャ', 'システム', '090-0000-0000', 2, true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 2. Update engineer_test@duesk.co.jp cognito_sub if needed
UPDATE users 
SET cognito_sub = '3826c3d7-989d-4462-bedb-7dcb59b79d16' 
WHERE email = 'engineer_test@duesk.co.jp' AND cognito_sub IS NULL;

-- 3. Add expense approver settings
INSERT INTO expense_approver_settings (id, approval_type, approver_id, is_active, priority, created_by, created_at, updated_at) VALUES 
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', 'manager', '3bb73c7d-4086-4304-a918-3d871c98ddc9', true, 1, '3bb73c7d-4086-4304-a918-3d871c98ddc9', NOW(), NOW()),
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', 'executive', '3bb73c7d-4086-4304-a918-3d871c98ddc9', true, 1, '3bb73c7d-4086-4304-a918-3d871c98ddc9', NOW(), NOW()),
(gen_random_uuid(), 'manager', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, 2, '3bb73c7d-4086-4304-a918-3d871c98ddc9', NOW(), NOW())
ON CONFLICT (approval_type, approver_id) DO NOTHING;

-- 4. Add user default work settings for new users
INSERT INTO user_default_work_settings (id, user_id, weekday_start_time, weekday_end_time, weekday_break_time, created_at, updated_at) 
SELECT gen_random_uuid(), id, '09:00', '18:00', 1.00, NOW(), NOW()
FROM users 
WHERE email IN ('admin@duesk.co.jp', 'daichiro.uesaka@duesk.co.jp', 'engineer_test@duesk.co.jp')
AND NOT EXISTS (
    SELECT 1 FROM user_default_work_settings WHERE user_id = users.id
);

-- 5. Verify data
SELECT COUNT(*) as user_count FROM users;
SELECT id, email, cognito_sub, role FROM users ORDER BY created_at DESC;
SELECT COUNT(*) as approver_count FROM expense_approver_settings;
SELECT approval_type, u.email as approver_email, eas.priority, eas.is_active 
FROM expense_approver_settings eas 
JOIN users u ON eas.approver_id = u.id 
ORDER BY approval_type, priority;