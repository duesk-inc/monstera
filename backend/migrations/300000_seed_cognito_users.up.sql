-- Cognito移行用のユーザーシードデータ
-- 本番環境では従業員登録機能からユーザーを作成してください

DO $$
DECLARE
    -- テスト用ユーザーID (Cognito Sub形式)
    test_user_id VARCHAR(255) := '37f4ba88-80e1-7053-57f9-84c245af87df';
    admin_user_id VARCHAR(255) := 'c754ea38-50c1-7073-43f0-680d98538caa';
    user1_id VARCHAR(255) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    user2_id VARCHAR(255) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
    -- システムユーザー（監査ログ用）
    system_user_id VARCHAR(255) := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- エンジニアテストユーザー（開発環境用）
    INSERT INTO users (
        id,
        email, 
        first_name, 
        last_name, 
        phone_number,
        role,
        status,
        created_at, 
        updated_at
    ) VALUES (
        test_user_id,
        'engineer_test@duesk.co.jp',
        'Engineer',
        'Test',
        '',
        4,  -- Engineer role
        'active',  -- Active status (文字列)
        NOW(), 
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = NOW();

    -- 管理者ユーザー（Cognito Sub設定済み想定）
    INSERT INTO users (
        id,
        email, 
        first_name, 
        last_name, 
        phone_number,
        role,
        status,
        created_at, 
        updated_at
    ) VALUES (
        admin_user_id,
        'admin@duesk.co.jp',
        'Admin',
        'User',
        '',
        2,  -- Admin
        'active',  -- Active status (文字列)
        NOW(), 
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = NOW();

    -- 一般ユーザー1（Cognito Sub設定済み想定）
    INSERT INTO users (
        id,
        email, 
        first_name, 
        last_name, 
        phone_number,
        role,
        status,
        created_at, 
        updated_at
    ) VALUES (
        user1_id,
        'tanaka.taro@duesk.co.jp',
        'Taro',
        'Tanaka',
        '',
        4,  -- Engineer role
        'active',  -- Active status (文字列)
        NOW(), 
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = NOW();

    -- 一般ユーザー2（Cognito Sub設定済み想定）
    INSERT INTO users (
        id,
        email, 
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
        'sato.hanako@duesk.co.jp',
        'Hanako',
        'Sato',
        '',
        4,  -- Engineer role
        'active',  -- Active status (文字列)
        'female',
        NOW(), 
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        gender = EXCLUDED.gender,
        updated_at = NOW();

    -- システムユーザー（監査ログ用）
    INSERT INTO users (
        id,
        email, 
        first_name, 
        last_name, 
        phone_number,
        role,
        status,
        created_at, 
        updated_at
    ) VALUES (
        system_user_id,
        'system@duesk.co.jp',
        'System',
        'User',
        '',
        4,  -- Engineer role
        'active',  -- Active status (文字列)
        NOW(), 
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = NOW();

    -- プロフィールとの関連付けに必要な場合は、profilesテーブルにも挿入
    -- （既存のプロフィールデータがあれば、user_idを更新）
    UPDATE profiles SET user_id = admin_user_id WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
    UPDATE profiles SET user_id = user1_id WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';
END $$;

-- 注意事項:
-- 1. 本番環境では従業員登録API (/api/v1/auth/register) を使用してください
-- 2. 上記のユーザーIDは実際のCognito Subに置き換える必要があります
-- 3. Cognito認証のみ使用されるため、パスワードフィールドは削除されました