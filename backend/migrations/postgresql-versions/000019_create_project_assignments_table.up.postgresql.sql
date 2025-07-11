-- エンジニア案件アサインテーブルの作成
CREATE TABLE IF NOT EXISTS project_assignments (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL, -- 案件ID
    user_id VARCHAR(36) NOT NULL, -- ユーザーID
    role VARCHAR(100), -- 役割
    start_date DATE NOT NULL, -- 参画開始日
    end_date DATE, -- 参画終了日
    utilization_rate INT DEFAULT 100, -- 稼働率（%）
    billing_rate DECIMAL(10, 2), -- 請求単価（この案件での単価）
    notes TEXT, -- 備考
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL, -- 削除日時
    CONSTRAINT fk_project_assignments_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_project_assignments_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_end_date ON project_assignments(end_date);
CREATE UNIQUE INDEX idx_project_assignments_active ON project_assignments(project_id, user_id, deleted_at);

-- Table comment
COMMENT ON TABLE project_assignments IS 'エンジニア案件アサインテーブル';


-- Triggers for automatic timestamp updates

-- Trigger for project_assignments table
CREATE OR REPLACE TRIGGER update_project_assignments_updated_at
    BEFORE UPDATE ON project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
