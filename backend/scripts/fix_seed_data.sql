-- Cognito-DB同期問題の修正スクリプト
-- 2025-07-30 作成

-- 1. まず既存のマイグレーション履歴をリセット
DELETE FROM schema_migrations WHERE version = '100000';
INSERT INTO schema_migrations (version, dirty) VALUES ('100000', false);

-- 2. シードデータを実行（PostgreSQL版）
DO $$
DECLARE
    -- ユーザーID
    admin_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    admin_user_id VARCHAR(36) := '3bb73c7d-4086-4304-a918-3d871c98ddc9';
    user1_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    user2_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
    -- engineer_test用の新しいID
    engineer_test_id VARCHAR(36) := '3826c3d7-989d-4462-bedb-7dcb59b79d16';
    
    -- プロフィールID
    profile1_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
    profile2_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';
    
    -- 承認者設定ID
    approver_manager_id VARCHAR(36) := 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01';
    approver_executive_id VARCHAR(36) := 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380f02';
    
BEGIN
    -- Users（基本ユーザー）
    INSERT INTO users (id, email, password, first_name, last_name, first_name_kana, last_name_kana, phone_number, role, active, created_at, updated_at) VALUES 
    (admin_id, 'daichiro.uesaka@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', '大地郎', '上坂', 'ダイチロウ', 'ウエサカ', '080-4555-5678', 2, true, NOW(), NOW()),
    (admin_user_id, 'admin@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', '管理者', 'システム', 'カンリシャ', 'システム', '090-0000-0000', 2, true, NOW(), NOW()),
    (user1_id, 'test@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', 'テスト', 'ユーザー', 'テスト', 'ユーザー', '090-1234-5678', 4, true, NOW(), NOW()),
    (user2_id, 'test2@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', 'テスト', 'ユーザー2', 'テスト', 'ユーザー', '080-8765-4321', 4, true, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- engineer_testユーザー（Cognitoに存在するユーザー）
    INSERT INTO users (id, email, password, first_name, last_name, first_name_kana, last_name_kana, phone_number, role, active, cognito_sub, created_at, updated_at) VALUES 
    (engineer_test_id, 'engineer_test@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', 'エンジニア', 'テスト', 'エンジニア', 'テスト', '090-5555-5555', 4, true, '3826c3d7-989d-4462-bedb-7dcb59b79d16', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET cognito_sub = EXCLUDED.cognito_sub;
    
    -- 経費申請承認者設定
    INSERT INTO expense_approver_settings (id, approval_type, approver_id, is_active, priority, created_by, created_at, updated_at) VALUES 
    (approver_manager_id, 'manager', admin_user_id, true, 1, admin_user_id, NOW(), NOW()),
    (approver_executive_id, 'executive', admin_user_id, true, 1, admin_user_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- 追加の承認者設定（daichiro.uesaka@duesk.co.jpも承認者として追加）
    INSERT INTO expense_approver_settings (id, approval_type, approver_id, is_active, priority, created_by, created_at, updated_at) VALUES 
    (gen_random_uuid(), 'manager', admin_id, true, 2, admin_user_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Profiles（サンプルプロファイル）
    INSERT INTO profiles (id, user_id, education, nearest_station, can_travel, is_temp_saved, temp_saved_at, current_version, created_at, updated_at) VALUES 
    (profile1_id, user1_id, '東京大学工学部', '東京駅', 1, false, NULL, 1, NOW(), NOW()),
    (profile2_id, user2_id, '京都大学理学部', '京都駅', 3, true, NOW(), 1, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- UserDefaultWorkSettings（デフォルト勤務時間設定）
    INSERT INTO user_default_work_settings (id, user_id, weekday_start_time, weekday_end_time, weekday_break_time, created_at, updated_at) VALUES 
    (gen_random_uuid(), admin_id, '09:00', '18:00', 1.00, NOW(), NOW()),
    (gen_random_uuid(), admin_user_id, '09:00', '18:00', 1.00, NOW(), NOW()),
    (gen_random_uuid(), user1_id, '10:00', '19:00', 1.00, NOW(), NOW()),
    (gen_random_uuid(), user2_id, '09:30', '18:30', 1.00, NOW(), NOW()),
    (gen_random_uuid(), engineer_test_id, '09:00', '18:00', 1.00, NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
END $$;

-- 3. データ確認
SELECT COUNT(*) as user_count FROM users;
SELECT id, email, cognito_sub FROM users WHERE email IN ('engineer_test@duesk.co.jp', 'admin@duesk.co.jp');
SELECT COUNT(*) as approver_count FROM expense_approver_settings;