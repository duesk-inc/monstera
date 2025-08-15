-- engineer_test@duesk.co.jpへ休暇データを付け替える
DO $$
DECLARE
    admin_user_id VARCHAR(255);
    engineer_test_user_id VARCHAR(255);
    
    -- 休暇種別ID
    paid_leave_id VARCHAR(255);
    summer_leave_id VARCHAR(255);
    condolence_leave_id VARCHAR(255);
    special_leave_id VARCHAR(255);
    substitute_leave_id VARCHAR(255);
    
    -- 現在の年度
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    -- ユーザーIDを取得
    SELECT id INTO admin_user_id FROM users WHERE email = 'daichiro.uesaka@duesk.co.jp' LIMIT 1;
    SELECT id INTO engineer_test_user_id FROM users WHERE email = 'engineer_test@duesk.co.jp' LIMIT 1;
    
    -- engineer_test_user_idが存在しない場合はエラー
    IF engineer_test_user_id IS NULL THEN
        RAISE EXCEPTION 'engineer_test@duesk.co.jp user not found';
    END IF;
    
    -- 休暇種別IDを取得
    SELECT id INTO paid_leave_id FROM leave_types WHERE code = 'paid' LIMIT 1;
    SELECT id INTO summer_leave_id FROM leave_types WHERE code = 'summer' LIMIT 1;
    SELECT id INTO condolence_leave_id FROM leave_types WHERE code = 'condolence' LIMIT 1;
    SELECT id INTO special_leave_id FROM leave_types WHERE code = 'special' LIMIT 1;
    SELECT id INTO substitute_leave_id FROM leave_types WHERE code = 'substitute' LIMIT 1;
    
    -- 既存のengineer_test用の休暇残高を削除
    DELETE FROM user_leave_balances WHERE user_id = engineer_test_user_id;
    
    -- 既存のengineer_test用の振替休暇付与を削除
    DELETE FROM substitute_leave_grants WHERE user_id = engineer_test_user_id;
    
    -- 既存のengineer_test用の休暇申請を削除（カスケード削除でleave_request_detailsも削除される）
    DELETE FROM leave_requests WHERE user_id = engineer_test_user_id;
    
    -- engineer_test用の休暇残高を作成
    INSERT INTO user_leave_balances (id, user_id, leave_type_id, fiscal_year, total_days, used_days, remaining_days, expire_date) VALUES 
    (gen_random_uuid()::text, engineer_test_user_id, paid_leave_id, current_year, 20.0, 5.0, 15.0, MAKE_DATE(current_year + 2, 3, 31)),
    (gen_random_uuid()::text, engineer_test_user_id, summer_leave_id, current_year, 5.0, 2.0, 3.0, MAKE_DATE(current_year, 9, 30)),
    (gen_random_uuid()::text, engineer_test_user_id, condolence_leave_id, current_year, 5.0, 0.0, 5.0, MAKE_DATE(current_year + 1, 3, 31)),
    (gen_random_uuid()::text, engineer_test_user_id, special_leave_id, current_year, 5.0, 1.0, 4.0, MAKE_DATE(current_year + 1, 3, 31)),
    (gen_random_uuid()::text, engineer_test_user_id, substitute_leave_id, current_year, 2.0, 0.0, 2.0, MAKE_DATE(current_year + 1, 3, 31));
    
    -- engineer_test用の振替休暇付与を作成
    INSERT INTO substitute_leave_grants (id, user_id, grant_date, granted_days, used_days, remaining_days, work_date, reason, expire_date, is_expired) VALUES 
    (gen_random_uuid()::text, engineer_test_user_id, CURRENT_DATE - INTERVAL '60 days', 1.0, 0.0, 1.0, CURRENT_DATE - INTERVAL '65 days', 'GW期間（5/3）出勤', MAKE_DATE(current_year + 1, 3, 31), FALSE),
    (gen_random_uuid()::text, engineer_test_user_id, CURRENT_DATE - INTERVAL '30 days', 1.0, 0.0, 1.0, CURRENT_DATE - INTERVAL '35 days', '年末年始期間（12/30）出勤', MAKE_DATE(current_year + 1, 3, 31), FALSE);
    
    -- 過去の承認済み休暇申請サンプルを作成
    DECLARE
        leave_request_id VARCHAR(255) := gen_random_uuid()::text;
    BEGIN
        INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at) VALUES 
        (leave_request_id, engineer_test_user_id, paid_leave_id, CURRENT_DATE - INTERVAL '30 days', FALSE, NULL, 1.0, 'approved', admin_user_id, CURRENT_DATE - INTERVAL '28 days');
        
        INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value) VALUES 
        (gen_random_uuid()::text, leave_request_id, CURRENT_DATE - INTERVAL '20 days', NULL, NULL, 1.0);
    END;
    
    -- 半日有給のサンプル
    DECLARE
        leave_request_id2 VARCHAR(255) := gen_random_uuid()::text;
    BEGIN
        INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at) VALUES 
        (leave_request_id2, engineer_test_user_id, paid_leave_id, CURRENT_DATE - INTERVAL '15 days', TRUE, NULL, 0.5, 'approved', admin_user_id, CURRENT_DATE - INTERVAL '14 days');
        
        INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value) VALUES 
        (gen_random_uuid()::text, leave_request_id2, CURRENT_DATE - INTERVAL '10 days', '13:00', '17:30', 0.5);
    END;
    
    -- 承認待ち申請のサンプル
    DECLARE
        leave_request_id3 VARCHAR(255) := gen_random_uuid()::text;
    BEGIN
        INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status) VALUES 
        (leave_request_id3, engineer_test_user_id, paid_leave_id, CURRENT_DATE, FALSE, NULL, 2.0, 'pending');
        
        INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value) VALUES 
        (gen_random_uuid()::text, leave_request_id3, CURRENT_DATE + INTERVAL '7 days', NULL, NULL, 1.0),
        (gen_random_uuid()::text, leave_request_id3, CURRENT_DATE + INTERVAL '8 days', NULL, NULL, 1.0);
    END;
    
    -- daichiro.uesaka@duesk.co.jpの休暇データを削除（オプション：残しておいても良い）
    -- DELETE FROM user_leave_balances WHERE user_id = admin_user_id;
    -- DELETE FROM substitute_leave_grants WHERE user_id = admin_user_id;
    -- DELETE FROM leave_requests WHERE user_id = admin_user_id;
    
    RAISE NOTICE 'Successfully transferred leave data to engineer_test@duesk.co.jp';
END $$;