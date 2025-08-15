-- engineer_test@duesk.co.jpの休暇データを削除
DO $$
DECLARE
    engineer_test_user_id VARCHAR(255);
BEGIN
    -- ユーザーIDを取得
    SELECT id INTO engineer_test_user_id FROM users WHERE email = 'engineer_test@duesk.co.jp' LIMIT 1;
    
    IF engineer_test_user_id IS NOT NULL THEN
        -- 休暇申請データを削除（カスケード削除でleave_request_detailsも削除される）
        DELETE FROM leave_requests WHERE user_id = engineer_test_user_id;
        
        -- 振替休暇付与データを削除
        DELETE FROM substitute_leave_grants WHERE user_id = engineer_test_user_id;
        
        -- 休暇残高データを削除
        DELETE FROM user_leave_balances WHERE user_id = engineer_test_user_id;
        
        RAISE NOTICE 'Successfully removed leave data from engineer_test@duesk.co.jp';
    ELSE
        RAISE NOTICE 'engineer_test@duesk.co.jp user not found';
    END IF;
END $$;