-- システムユーザーの作成（未認証アクションの監査ログ用）
-- Cognito Sub形式のIDを使用

-- システムユーザーを挿入
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
    '00000000-0000-0000-0000-000000000000',  -- システムID（36文字のUUID形式）
    'system@internal',
    '00000000-0000-0000-0000-000000000000',
    'System',
    'User',
    'System User',
    'システム',
    'ユーザー',
    '000-0000-0000',
    4,  -- engineer role (権限なし)
    false,  -- 非アクティブ
    'system',
    'active',  -- engineer_statusは有効な値を使用
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- デフォルトの勤務設定を追加（必須のため）
INSERT INTO user_default_work_settings (id, user_id, weekday_start_time, weekday_end_time, weekday_break_time)
SELECT 
    gen_random_uuid(),
    u.id,
    '00:00',
    '00:00',
    0.00
FROM users u
WHERE u.id = '00000000-0000-0000-0000-000000000000'
AND NOT EXISTS (
    SELECT 1 FROM user_default_work_settings udws 
    WHERE udws.user_id = u.id
);