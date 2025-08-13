-- プロジェクトグループテーブル作成（PostgreSQL版）
CREATE TABLE IF NOT EXISTS project_groups (
    id VARCHAR(36) PRIMARY KEY DEFAULT (gen_random_uuid()::text),
    group_name VARCHAR(255) NOT NULL, -- グループ名
    client_id VARCHAR(36) NOT NULL, -- 取引先ID
    description TEXT, -- 説明
    created_by VARCHAR(255) NOT NULL, -- 作成者ID
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP(3) NULL,
    
    CONSTRAINT fk_project_groups_client FOREIGN KEY (client_id) REFERENCES clients(id),
    CONSTRAINT fk_project_groups_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- インデックス
CREATE INDEX idx_project_groups_client_id ON project_groups(client_id);
CREATE INDEX idx_project_groups_deleted_at ON project_groups(deleted_at);

-- コメント
COMMENT ON TABLE project_groups IS 'プロジェクトグループ管理';
COMMENT ON COLUMN project_groups.group_name IS 'グループ名';
COMMENT ON COLUMN project_groups.client_id IS '取引先ID';
COMMENT ON COLUMN project_groups.description IS '説明';
COMMENT ON COLUMN project_groups.created_by IS '作成者ID';

-- トリガー関数が存在しない場合は作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates

-- Trigger for project_groups table
CREATE TRIGGER update_project_groups_updated_at
    BEFORE UPDATE ON project_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();