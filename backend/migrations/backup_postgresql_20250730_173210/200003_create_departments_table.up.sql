-- 部署管理テーブルの作成
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL COMMENT '部署名',
    parent_id VARCHAR(36) COMMENT '親部署ID',
    manager_id VARCHAR(36) COMMENT '部署責任者ID',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '表示順',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '有効フラグ',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_departments_parent (parent_id),
    INDEX idx_departments_active (is_active, deleted_at),
    INDEX idx_departments_sort_order (sort_order),
    CONSTRAINT fk_departments_parent FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='部署マスタ';

-- 基本的な部署データの挿入
INSERT INTO departments (id, name, parent_id, manager_id, sort_order, is_active) VALUES
(UUID(), '開発部', NULL, NULL, 1, TRUE),
(UUID(), '営業部', NULL, NULL, 2, TRUE),
(UUID(), '総務部', NULL, NULL, 3, TRUE),
(UUID(), 'システム部', NULL, NULL, 4, TRUE);

-- 開発部の子部署
INSERT INTO departments (id, name, parent_id, manager_id, sort_order, is_active) 
SELECT UUID(), 'フロントエンド課', d.id, NULL, 1, TRUE 
FROM departments d WHERE d.name = '開発部';

INSERT INTO departments (id, name, parent_id, manager_id, sort_order, is_active) 
SELECT UUID(), 'バックエンド課', d.id, NULL, 2, TRUE 
FROM departments d WHERE d.name = '開発部';

INSERT INTO departments (id, name, parent_id, manager_id, sort_order, is_active) 
SELECT UUID(), 'インフラ課', d.id, NULL, 3, TRUE 
FROM departments d WHERE d.name = '開発部';