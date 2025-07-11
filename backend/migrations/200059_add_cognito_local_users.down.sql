-- Cognito Local開発環境用ユーザーの削除（PostgreSQL版）

-- 休暇残高の削除
DELETE FROM user_leave_balances ulb
USING users u
WHERE ulb.user_id = u.id
AND u.email IN ('admin@duesk.co.jp', 'engineer_test@duesk.co.jp');

-- デフォルト勤務設定の削除
DELETE FROM user_default_work_settings udws
USING users u
WHERE udws.user_id = u.id
AND u.email IN ('admin@duesk.co.jp', 'engineer_test@duesk.co.jp');

-- ユーザーの削除
DELETE FROM users 
WHERE email IN ('admin@duesk.co.jp', 'engineer_test@duesk.co.jp');