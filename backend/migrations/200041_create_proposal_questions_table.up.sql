-- 提案質問テーブルの作成
-- エンジニアが提案に対して行う質問と、営業担当者からの回答を管理するテーブル
CREATE TABLE IF NOT EXISTS proposal_questions (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    proposal_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '提案ID',
    question_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '質問内容',
    response_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '回答内容',
    sales_user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '営業担当者ID',
    is_responded BOOLEAN NOT NULL DEFAULT FALSE COMMENT '回答済みフラグ',
    responded_at DATETIME(3) COMMENT '回答日時',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
    deleted_at DATETIME(3) NULL COMMENT '削除日時',
    
    CONSTRAINT fk_proposal_questions_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_proposal_questions_sales_user FOREIGN KEY (sales_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_proposal_questions_proposal_id (proposal_id),
    INDEX idx_proposal_questions_sales_user_id (sales_user_id),
    INDEX idx_proposal_questions_is_responded (is_responded),
    INDEX idx_proposal_questions_created_at (created_at),
    INDEX idx_proposal_questions_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提案質問テーブル';