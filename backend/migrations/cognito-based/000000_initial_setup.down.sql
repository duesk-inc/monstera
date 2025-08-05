-- 初期設定のロールバック

-- ENUM型の削除
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS engineer_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 関数の削除
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 拡張機能の削除（必要に応じて）
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- DROP EXTENSION IF EXISTS "uuid-ossp";