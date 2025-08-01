-- user_rolesテーブルの作成（多対多のロール管理）
CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    role TINYINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, role),
    
    -- 外部キー制約
    CONSTRAINT fk_user_roles_user_id
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- インデックス
    INDEX idx_user_roles_user_id (user_id),
    INDEX idx_user_roles_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 既存のusersテーブルのroleデータをuser_rolesテーブルに移行
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM users WHERE role IS NOT NULL;

-- 管理者ユーザーに対してemployeeロールも追加（管理者でもありエンジニアでもある）
-- 注：これはオプション。必要に応じてコメントアウトしてください
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 4 FROM users WHERE role = 2 AND id NOT IN (
--     SELECT user_id FROM user_roles WHERE user_id = users.id AND role = 4
-- );