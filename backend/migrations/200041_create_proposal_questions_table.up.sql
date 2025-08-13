-- 提案質問テーブルの作成
-- エンジニアが提案に対して行う質問と、営業担当者からの回答を管理するテーブル
CREATE TABLE IF NOT EXISTS proposal_questions (
    id VARCHAR(36) PRIMARY KEY,
    proposal_id VARCHAR(36) NOT NULL, -- 提案ID
    question_text TEXT NOT NULL, -- 質問内容
    response_text TEXT, -- 回答内容
    sales_user_id VARCHAR(255), -- 営業担当者ID
    is_responded BOOLEAN NOT NULL DEFAULT FALSE, -- 回答済みフラグ
    responded_at TIMESTAMP(3), -- 回答日時
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL, -- 削除日時
    CONSTRAINT fk_proposal_questions_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_proposal_questions_sales_user FOREIGN KEY (sales_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
); -- 提案質問テーブル

-- インデックスの作成
CREATE INDEX idx_proposal_questions_proposal_id ON proposal_questions (proposal_id);
CREATE INDEX idx_proposal_questions_sales_user_id ON proposal_questions (sales_user_id);
CREATE INDEX idx_proposal_questions_is_responded ON proposal_questions (is_responded);
CREATE INDEX idx_proposal_questions_created_at ON proposal_questions (created_at);
CREATE INDEX idx_proposal_questions_deleted_at ON proposal_questions (deleted_at);


-- Triggers for automatic timestamp updates

-- Trigger for proposal_questions table
CREATE OR REPLACE TRIGGER update_proposal_questions_updated_at
    BEFORE UPDATE ON proposal_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
