-- 部署テーブルの削除

-- トリガーの削除
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;

-- インデックスの削除
DROP INDEX IF EXISTS idx_departments_deleted_at;
DROP INDEX IF EXISTS idx_departments_is_active;
DROP INDEX IF EXISTS idx_departments_manager_id;
DROP INDEX IF EXISTS idx_departments_parent_id;
DROP INDEX IF EXISTS idx_departments_code;

-- テーブルの削除
DROP TABLE IF EXISTS departments CASCADE;