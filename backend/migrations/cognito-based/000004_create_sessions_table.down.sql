-- セッション管理テーブルの削除

-- トリガーの削除
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;

-- インデックスの削除
DROP INDEX IF EXISTS idx_sessions_last_activity;
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_sessions_token;
DROP INDEX IF EXISTS idx_sessions_user_id;

-- テーブルの削除
DROP TABLE IF EXISTS sessions CASCADE;