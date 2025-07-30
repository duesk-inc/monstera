-- プロジェクトグループマッピングテーブル作成
CREATE TABLE IF NOT EXISTS project_group_mappings (
    id VARCHAR(36) PRIMARY KEY,
    project_group_id VARCHAR(36) NOT NULL, -- プロジェクトグループID
    project_id VARCHAR(36) NOT NULL, -- プロジェクトID
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT idx_group_project UNIQUE (project_group_id, project_id),
    CONSTRAINT fk_project_group_mappings_project_group FOREIGN KEY (project_group_id) REFERENCES project_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_group_mappings_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
); -- プロジェクトグループマッピング

-- インデックスの作成
CREATE INDEX idx_mappings_project_id ON project_group_mappings (project_id);
