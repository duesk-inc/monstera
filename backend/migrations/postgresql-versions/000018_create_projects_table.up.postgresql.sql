-- Create project_status enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM ('proposal', 'negotiation', 'active', 'closed', 'lost');
    END IF;
END $$;

-- Create contract_type enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_type') THEN
        CREATE TYPE contract_type AS ENUM ('ses', 'contract', 'dispatch');
    END IF;
END $$;

-- 案件管理テーブルの作成
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL, -- 取引先ID
    project_name VARCHAR(200) NOT NULL, -- 案件名
    project_code VARCHAR(50), -- 案件コード
    status project_status DEFAULT 'proposal', -- 案件ステータス
    start_date DATE, -- 開始日
    end_date DATE, -- 終了予定日
    monthly_rate DECIMAL(10, 2), -- 月額単価
    working_hours_min INT DEFAULT 140, -- 最低稼働時間
    working_hours_max INT DEFAULT 180, -- 最高稼働時間
    contract_type contract_type DEFAULT 'ses', -- 契約形態
    work_location VARCHAR(255), -- 勤務地
    description TEXT, -- 案件詳細
    requirements TEXT, -- 必要スキル・要件
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL, -- 削除日時
    CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_end_date ON projects(end_date);
CREATE INDEX idx_projects_project_code ON projects(project_code);

-- Table comment
COMMENT ON TABLE projects IS '案件管理テーブル';


-- Triggers for automatic timestamp updates

-- Trigger for projects table
CREATE OR REPLACE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
