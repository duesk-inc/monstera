-- システムユーザーの削除

-- 勤務設定を削除
DELETE FROM user_default_work_settings WHERE user_id = 'system-00000000-0000-0000-0000-000000000000';

-- システムユーザーを削除
DELETE FROM users WHERE id = 'system-00000000-0000-0000-0000-000000000000';