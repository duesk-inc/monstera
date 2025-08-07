-- Cognito移行用のユーザーシードデータを削除

DELETE FROM users WHERE email IN (
    'engineer_test@duesk.co.jp',
    'admin@duesk.co.jp',
    'tanaka.taro@duesk.co.jp',
    'sato.hanako@duesk.co.jp'
);