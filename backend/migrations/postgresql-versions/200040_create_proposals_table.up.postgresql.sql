-- ENUM型の作成
DO $$
BEGIN
    -- status用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
        CREATE TYPE proposal_status AS ENUM ('proposed', 'proceed', 'declined');
    END IF;
END$$;

-- 提案情報テーブルの作成
-- エンジニアに対して個別提案された案件情報を管理するテーブル
CREATE TABLE IF NOT EXISTS proposals (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL, -- monstera_poc.projects.id参照
    user_id VARCHAR(36) NOT NULL, -- エンジニアID
    status proposal_status NOT NULL DEFAULT 'proposed', -- 提案ステータス
    responded_at TIMESTAMP(3), -- 回答日時
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL, -- 削除日時
    CONSTRAINT fk_proposals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
); -- 提案情報テーブル

-- インデックスの作成
CREATE INDEX idx_proposals_user_id ON proposals (user_id);
CREATE INDEX idx_proposals_project_id ON proposals (project_id);
CREATE INDEX idx_proposals_status ON proposals (status);
CREATE INDEX idx_proposals_responded_at ON proposals (responded_at);
CREATE INDEX idx_proposals_created_at ON proposals (created_at);
CREATE INDEX idx_proposals_deleted_at ON proposals (deleted_at);

-- ユニーク制約
CREATE UNIQUE INDEX idx_proposal_user_project ON proposals (project_id, user_id, deleted_at);


-- Triggers for automatic timestamp updates

-- Trigger for proposals table
CREATE OR REPLACE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
