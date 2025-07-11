-- 部署管理テーブルの作成
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    name VARCHAR(100) NOT NULL, -- 部署名
    parent_id VARCHAR(36), -- 親部署ID
    manager_id VARCHAR(36), -- 部署責任者ID
    sort_order INT NOT NULL DEFAULT 0, -- 表示順
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- 有効フラグ
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_departments_parent FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- インデックスの作成
CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_departments_active ON departments(is_active, deleted_at);
CREATE INDEX idx_departments_sort_order ON departments(sort_order);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE departments IS '部署マスタ';
COMMENT ON COLUMN departments.name IS '部署名';
COMMENT ON COLUMN departments.parent_id IS '親部署ID';
COMMENT ON COLUMN departments.manager_id IS '部署責任者ID';
COMMENT ON COLUMN departments.sort_order IS '表示順';
COMMENT ON COLUMN departments.is_active IS '有効フラグ';

-- 基本的な部署データの挿入
INSERT INTO departments (id, name, parent_id, manager_id, sort_order, is_active) VALUES 
    (gen_random_uuid()::text, '開発部', NULL, NULL, 1, TRUE),
    (gen_random_uuid()::text, '営業部', NULL, NULL, 2, TRUE),
    (gen_random_uuid()::text, '総務部', NULL, NULL, 3, TRUE),
    (gen_random_uuid()::text, 'システム部', NULL, NULL, 4, TRUE);

-- 開発部の子部署
INSERT INTO departments (id, name, parent_id, manager_id, sort_order, is_active) 
SELECT gen_random_uuid()::text, 'フロントエンド課', d.id, NULL, 1, TRUE 
FROM departments d WHERE d.name = '開発部';

INSERT INTO departments (id, name, parent_id, manager_id, sort_order, is_active) 
SELECT gen_random_uuid()::text, 'バックエンド課', d.id, NULL, 2, TRUE 
FROM departments d WHERE d.name = '開発部';

INSERT INTO departments (id, name, parent_id, manager_id, sort_order, is_active) 
SELECT gen_random_uuid()::text, 'インフラ課', d.id, NULL, 3, TRUE 
FROM departments d WHERE d.name = '開発部';


-- Triggers for automatic timestamp updates

-- Trigger for departments table
CREATE OR REPLACE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
