-- ユーザーテーブルに部署関連カラムを追加
ALTER TABLE users 
ADD COLUMN department_id VARCHAR(36) COMMENT '所属部署ID' AFTER role,
ADD COLUMN manager_id VARCHAR(36) COMMENT '直属上司ID' AFTER department_id;

-- インデックスの追加
ALTER TABLE users 
ADD INDEX idx_users_department (department_id),
ADD INDEX idx_users_manager (manager_id);

-- 外部キー制約の追加（部署とユーザーが削除された場合のNULLセット）
ALTER TABLE users 
ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;