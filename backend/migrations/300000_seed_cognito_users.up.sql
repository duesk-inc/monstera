-- Cognito移行用のユーザーシードデータ
-- 本番環境では従業員登録機能からユーザーを作成してください

DO $$
DECLARE
    -- テスト用ユーザーID (Cognito Sub形式)
    test_user_id VARCHAR(255) := '17a40a68-a061-7028-e5a0-db2da1ee6e6d';
    admin_user_id VARCHAR(255) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    user1_id VARCHAR(255) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    user2_id VARCHAR(255) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
BEGIN
    -- エンジニアテストユーザー（開発環境用）
    INSERT INTO users (
        id, 
        cognito_sub, 
        email, 
        password,  -- Cognito認証のためダミー値
        first_name, 
        last_name, 
        phone_number,
        role,
        status,
        created_at, 
        updated_at
    ) VALUES (
        test_user_id,
        test_user_id, 
        'engineer_test@duesk.co.jp',
        'cognito-auth-only',  -- Cognito認証のみ使用
        'Engineer',
        'Test',
        '',
        0,  -- Employee
        1,  -- Active
        NOW(), 
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- 管理者ユーザー（Cognito Sub設定済み想定）
    INSERT INTO users (
        id, 
        cognito_sub, 
        email, 
        password,
        first_name, 
        last_name, 
        phone_number,
        role,
        status,
        created_at, 
        updated_at
    ) VALUES (
        admin_user_id,
        admin_user_id,  -- 実際のCognito Subに置き換えてください
        'admin@duesk.co.jp',
        'cognito-auth-only',
        'Admin',
        'User',
        '',
        2,  -- Admin
        1,  -- Active
        NOW(), 
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- 一般ユーザー1（Cognito Sub設定済み想定）
    INSERT INTO users (
        id, 
        cognito_sub, 
        email, 
        password,
        first_name, 
        last_name, 
        phone_number,
        role,
        status,
        created_at, 
        updated_at
    ) VALUES (
        user1_id,
        user1_id,  -- 実際のCognito Subに置き換えてください
        'tanaka.taro@duesk.co.jp',
        'cognito-auth-only',
        'Taro',
        'Tanaka',
        '',
        0,  -- Employee
        1,  -- Active
        NOW(), 
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- 一般ユーザー2（Cognito Sub設定済み想定）
    INSERT INTO users (
        id, 
        cognito_sub, 
        email, 
        password,
        first_name, 
        last_name, 
        phone_number,
        role,
        status,
        gender,  -- 生理休暇テスト用
        created_at, 
        updated_at
    ) VALUES (
        user2_id,
        user2_id,  -- 実際のCognito Subに置き換えてください
        'sato.hanako@duesk.co.jp',
        'cognito-auth-only',
        'Hanako',
        'Sato',
        '',
        0,  -- Employee
        1,  -- Active
        'female',
        NOW(), 
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- プロフィールとの関連付けに必要な場合は、profilesテーブルにも挿入
    -- （既存のプロフィールデータがあれば、user_idを更新）
    UPDATE profiles SET user_id = admin_user_id WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
    UPDATE profiles SET user_id = user1_id WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';
END $$;

-- 注意事項:
-- 1. 本番環境では従業員登録API (/api/v1/auth/register) を使用してください
-- 2. 上記のユーザーIDは実際のCognito Subに置き換える必要があります
-- 3. パスワードフィールドは互換性のため残していますが、Cognito認証のみ使用されます