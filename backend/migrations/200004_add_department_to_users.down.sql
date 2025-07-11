-- ユーザーテーブルの部署関連カラムを削除
ALTER TABLE users 
DROP FOREIGN KEY fk_users_department,
DROP FOREIGN KEY fk_users_manager,
DROP INDEX idx_users_department,
DROP INDEX idx_users_manager,
DROP COLUMN department_id,
DROP COLUMN manager_id;