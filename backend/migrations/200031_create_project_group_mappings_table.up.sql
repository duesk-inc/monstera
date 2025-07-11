-- プロジェクトグループマッピングテーブル作成
CREATE TABLE IF NOT EXISTS project_group_mappings (
    id VARCHAR(36) PRIMARY KEY,
    project_group_id VARCHAR(36) NOT NULL COMMENT 'プロジェクトグループID',
    project_id VARCHAR(36) NOT NULL COMMENT 'プロジェクトID',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY idx_group_project (project_group_id, project_id),
    INDEX idx_mappings_project_id (project_id),
    FOREIGN KEY (project_group_id) REFERENCES project_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='プロジェクトグループマッピング';