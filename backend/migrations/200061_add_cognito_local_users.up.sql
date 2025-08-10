-- Cognito Localの開発環境用ユーザーをDBに追加（PostgreSQL版）
-- これらのユーザーはCognito Localに既に存在しているため、DBにも同期させる必要がある

-- admin@duesk.co.jp ユーザーの追加（管理者権限）
INSERT INTO users (
    id, 
    email, 
    cognito_sub, 
    first_name, 
    last_name, 
    name,
    first_name_kana, 
    last_name_kana, 
    phone_number, 
    role, 
    active,
    status,
    engineer_status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin@duesk.co.jp',
    'c754ea38-50c1-7073-43f0-680d98538caa',
    'Admin',
    'User',
    'Admin User',
    'アドミン',
    'ユーザー',
    '090-0000-0001',
    2,  -- admin role
    true,
    'active',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    cognito_sub = EXCLUDED.cognito_sub,
    updated_at = NOW();

-- engineer_test@duesk.co.jp ユーザーの追加（一般社員）
INSERT INTO users (
    id, 
    email, 
    cognito_sub, 
    first_name, 
    last_name, 
    name,
    first_name_kana, 
    last_name_kana, 
    phone_number, 
    role, 
    active,
    status,
    engineer_status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'engineer_test@duesk.co.jp',
    '37f4ba88-80e1-7053-57f9-84c245af87df',
    'Employee',
    'User',
    'Employee User',
    'エンプロイー',
    'ユーザー',
    '090-0000-0002',
    4,  -- employee role
    true,
    'active',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    cognito_sub = EXCLUDED.cognito_sub,
    updated_at = NOW();

-- デフォルトの勤務設定を追加
INSERT INTO user_default_work_settings (id, user_id, weekday_start_time, weekday_end_time, weekday_break_time)
SELECT 
    gen_random_uuid(),
    u.id,
    '09:00',
    '18:00',
    1.00
FROM users u
WHERE u.email IN ('admin@duesk.co.jp', 'engineer_test@duesk.co.jp')
AND NOT EXISTS (
    SELECT 1 FROM user_default_work_settings udws 
    WHERE udws.user_id = u.id
);

-- 現在の年度の休暇残高を設定
DO $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    paid_leave_id UUID;
    summer_leave_id UUID;
    condolence_leave_id UUID;
    special_leave_id UUID;
    substitute_leave_id UUID;
BEGIN
    -- 各休暇タイプのIDを取得
    SELECT id INTO paid_leave_id FROM leave_types WHERE code = 'paid' LIMIT 1;
    SELECT id INTO summer_leave_id FROM leave_types WHERE code = 'summer' LIMIT 1;
    SELECT id INTO condolence_leave_id FROM leave_types WHERE code = 'condolence' LIMIT 1;
    SELECT id INTO special_leave_id FROM leave_types WHERE code = 'special' LIMIT 1;
    SELECT id INTO substitute_leave_id FROM leave_types WHERE code = 'substitute' LIMIT 1;

    -- admin@duesk.co.jp の休暇残高を追加
    INSERT INTO user_leave_balances (id, user_id, leave_type_id, fiscal_year, total_days, used_days, remaining_days, expire_date)
    SELECT 
        gen_random_uuid(),
        u.id,
        lt.id,
        current_year,
        CASE 
            WHEN lt.code = 'paid' THEN 20.0
            WHEN lt.code = 'summer' THEN 5.0
            WHEN lt.code = 'condolence' THEN 5.0
            WHEN lt.code = 'special' THEN 5.0
            WHEN lt.code = 'substitute' THEN 0.0
        END,
        0.0,  -- 使用日数
        CASE 
            WHEN lt.code = 'paid' THEN 20.0
            WHEN lt.code = 'summer' THEN 5.0
            WHEN lt.code = 'condolence' THEN 5.0
            WHEN lt.code = 'special' THEN 5.0
            WHEN lt.code = 'substitute' THEN 0.0
        END,  -- 残日数
        CASE 
            WHEN lt.code = 'paid' THEN DATE(CONCAT(current_year + 1, '-03-31')) + INTERVAL '1 year'
            WHEN lt.code = 'summer' THEN DATE(CONCAT(current_year, '-09-30'))
            ELSE DATE(CONCAT(current_year + 1, '-03-31'))
        END
    FROM users u
    CROSS JOIN leave_types lt
    WHERE u.email = 'admin@duesk.co.jp'
    AND lt.code IN ('paid', 'summer', 'condolence', 'special', 'substitute')
    AND NOT EXISTS (
        SELECT 1 FROM user_leave_balances ulb 
        WHERE ulb.user_id = u.id 
        AND ulb.leave_type_id = lt.id 
        AND ulb.fiscal_year = current_year
    );

    -- engineer_test@duesk.co.jp の休暇残高を追加
    INSERT INTO user_leave_balances (id, user_id, leave_type_id, fiscal_year, total_days, used_days, remaining_days, expire_date)
    SELECT 
        gen_random_uuid(),
        u.id,
        lt.id,
        current_year,
        CASE 
            WHEN lt.code = 'paid' THEN 20.0
            WHEN lt.code = 'summer' THEN 5.0
            WHEN lt.code = 'condolence' THEN 5.0
            WHEN lt.code = 'special' THEN 5.0
            WHEN lt.code = 'substitute' THEN 0.0
        END,
        0.0,  -- 使用日数
        CASE 
            WHEN lt.code = 'paid' THEN 20.0
            WHEN lt.code = 'summer' THEN 5.0
            WHEN lt.code = 'condolence' THEN 5.0
            WHEN lt.code = 'special' THEN 5.0
            WHEN lt.code = 'substitute' THEN 0.0
        END,  -- 残日数
        CASE 
            WHEN lt.code = 'paid' THEN DATE(CONCAT(current_year + 1, '-03-31')) + INTERVAL '1 year'
            WHEN lt.code = 'summer' THEN DATE(CONCAT(current_year, '-09-30'))
            ELSE DATE(CONCAT(current_year + 1, '-03-31'))
        END
    FROM users u
    CROSS JOIN leave_types lt
    WHERE u.email = 'engineer_test@duesk.co.jp'
    AND lt.code IN ('paid', 'summer', 'condolence', 'special', 'substitute')
    AND NOT EXISTS (
        SELECT 1 FROM user_leave_balances ulb 
        WHERE ulb.user_id = u.id 
        AND ulb.leave_type_id = lt.id 
        AND ulb.fiscal_year = current_year
    );
END $$;