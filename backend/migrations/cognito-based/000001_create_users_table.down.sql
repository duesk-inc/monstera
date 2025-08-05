-- Usersテーブルの削除

-- トリガーの削除
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- インデックスの削除（テーブル削除時に自動的に削除されるが明示的に記載）
DROP INDEX IF EXISTS idx_users_deleted_at;
DROP INDEX IF EXISTS idx_users_active;
DROP INDEX IF EXISTS idx_users_status;
DROP INDEX IF EXISTS idx_users_manager_id;
DROP INDEX IF EXISTS idx_users_department_id;
DROP INDEX IF EXISTS idx_users_sei_kana_mei_kana;
DROP INDEX IF EXISTS idx_users_sei_mei;
DROP INDEX IF EXISTS idx_users_engineer_status;
DROP INDEX IF EXISTS idx_users_employee_number;
DROP INDEX IF EXISTS idx_users_last_follow_up_date;
DROP INDEX IF EXISTS idx_users_follow_up_required;
DROP INDEX IF EXISTS idx_users_default_role;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_email;

-- テーブルの削除
DROP TABLE IF EXISTS users CASCADE;