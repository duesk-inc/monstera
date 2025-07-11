-- プロジェクトグループテーブル作成
CREATE TABLE IF NOT EXISTS project_groups (
    id VARCHAR(36) PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL COMMENT 'グループ名',
    client_id VARCHAR(36) NOT NULL COMMENT '取引先ID',
    description TEXT COMMENT '説明',
    created_by VARCHAR(36) NOT NULL COMMENT '作成者ID',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    INDEX idx_project_groups_client_id (client_id),
    INDEX idx_project_groups_deleted_at (deleted_at),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='プロジェクトグループ管理';