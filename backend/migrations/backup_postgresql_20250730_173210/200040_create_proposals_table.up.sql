-- 提案情報テーブルの作成
-- エンジニアに対して個別提案された案件情報を管理するテーブル
CREATE TABLE IF NOT EXISTS proposals (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    project_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'monstera_poc.projects.id参照',
    user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'エンジニアID',
    status ENUM('proposed', 'proceed', 'declined') NOT NULL DEFAULT 'proposed' COMMENT '提案ステータス',
    responded_at DATETIME(3) COMMENT '回答日時',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
    deleted_at DATETIME(3) NULL COMMENT '削除日時',
    
    CONSTRAINT fk_proposals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_proposals_user_id (user_id),
    INDEX idx_proposals_project_id (project_id),
    INDEX idx_proposals_status (status),
    INDEX idx_proposals_responded_at (responded_at),
    INDEX idx_proposals_created_at (created_at),
    INDEX idx_proposals_deleted_at (deleted_at),
    UNIQUE KEY idx_proposal_user_project (project_id, user_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提案情報テーブル';