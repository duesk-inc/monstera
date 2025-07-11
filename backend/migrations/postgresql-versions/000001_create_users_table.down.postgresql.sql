-- トリガーを削除
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- テーブルを削除
DROP TABLE IF EXISTS users;