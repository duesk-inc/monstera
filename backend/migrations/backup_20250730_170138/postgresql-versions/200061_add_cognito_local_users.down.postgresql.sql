-- Cognito Local開発環境用ユーザーのクリーンアップ

-- 休暇残高の削除
DELETE FROM user_leave_balances 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email IN ('admin@duesk.co.jp', 'engineer_test@duesk.co.jp')
);

-- デフォルト勤務設定の削除
DELETE FROM user_default_work_settings 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email IN ('admin@duesk.co.jp', 'engineer_test@duesk.co.jp')
);

-- ユーザーの削除
DELETE FROM users 
WHERE email IN ('admin@duesk.co.jp', 'engineer_test@duesk.co.jp');