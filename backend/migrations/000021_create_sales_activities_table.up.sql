-- Create activity_type enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
        CREATE TYPE activity_type AS ENUM ('new_proposal', 'extension', 'upsell', 'replacement', 'other');
    END IF;
END $$;

-- Create sales_status enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_status') THEN
        CREATE TYPE sales_status AS ENUM ('planning', 'proposed', 'negotiating', 'won', 'lost', 'on_hold');
    END IF;
END $$;

-- 営業活動管理テーブルの作成
CREATE TABLE IF NOT EXISTS sales_activities (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL, -- 取引先ID
    project_id VARCHAR(36), -- 関連案件ID
    activity_type activity_type NOT NULL, -- 活動タイプ
    target_user_id VARCHAR(255), -- 対象エンジニアID
    sales_rep_id VARCHAR(255), -- 担当営業ID
    status sales_status DEFAULT 'planning', -- ステータス
    probability INT DEFAULT 0, -- 成約確率（%）
    estimated_monthly_amount DECIMAL(10, 2), -- 予想月額
    estimated_start_date DATE, -- 予想開始日
    next_action VARCHAR(255), -- 次回アクション
    next_action_date DATE, -- 次回アクション日
    notes TEXT, -- メモ
    lost_reason VARCHAR(255), -- 失注理由
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL, -- 削除日時
    CONSTRAINT fk_sales_activities_client FOREIGN KEY (client_id) REFERENCES clients(id),
    CONSTRAINT fk_sales_activities_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_sales_activities_user FOREIGN KEY (target_user_id) REFERENCES users(id),
    CONSTRAINT fk_sales_activities_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES users(id)
);

-- インデックスの作成
CREATE INDEX idx_sales_activities_status ON sales_activities(status);
CREATE INDEX idx_sales_activities_next_action ON sales_activities(next_action_date);
CREATE INDEX idx_sales_activities_client_id ON sales_activities(client_id);
CREATE INDEX idx_sales_activities_target_user_id ON sales_activities(target_user_id);

-- PostgreSQL用のコメント設定
COMMENT ON TABLE sales_activities IS '営業活動管理テーブル';
COMMENT ON COLUMN sales_activities.client_id IS '取引先ID';
COMMENT ON COLUMN sales_activities.project_id IS '関連案件ID';
COMMENT ON COLUMN sales_activities.activity_type IS '活動タイプ';
COMMENT ON COLUMN sales_activities.target_user_id IS '対象エンジニアID';
COMMENT ON COLUMN sales_activities.sales_rep_id IS '担当営業ID';
COMMENT ON COLUMN sales_activities.status IS 'ステータス';
COMMENT ON COLUMN sales_activities.probability IS '成約確率（%）';
COMMENT ON COLUMN sales_activities.estimated_monthly_amount IS '予想月額';
COMMENT ON COLUMN sales_activities.estimated_start_date IS '予想開始日';
COMMENT ON COLUMN sales_activities.next_action IS '次回アクション';
COMMENT ON COLUMN sales_activities.next_action_date IS '次回アクション日';
COMMENT ON COLUMN sales_activities.notes IS 'メモ';
COMMENT ON COLUMN sales_activities.lost_reason IS '失注理由';
COMMENT ON COLUMN sales_activities.created_at IS '作成日時';
COMMENT ON COLUMN sales_activities.updated_at IS '更新日時';
COMMENT ON COLUMN sales_activities.deleted_at IS '削除日時';


-- Triggers for automatic timestamp updates

-- Trigger for sales_activities table
CREATE OR REPLACE TRIGGER update_sales_activities_updated_at
    BEFORE UPDATE ON sales_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
