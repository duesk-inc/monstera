-- project_assignmentsテーブル作成（全カラム統合版）
-- 統合元:
-- - 000019_create_project_assignments_table.up.postgresql.sql
-- - 200035_extend_project_assignments_for_billing.up.postgresql.sql

-- ENUM型の作成
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type_enum') THEN
        CREATE TYPE billing_type_enum AS ENUM ('fixed', 'variable_upper_lower', 'variable_middle');
    END IF;
END $$;

-- エンジニア案件アサインテーブルの作成
CREATE TABLE IF NOT EXISTS project_assignments (
    id VARCHAR(36) PRIMARY KEY,
    -- 基本情報
    project_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    utilization_rate INT DEFAULT 100,
    billing_rate DECIMAL(10, 2),
    notes TEXT,
    -- 統合: 200035から請求精算用カラム
    billing_type billing_type_enum DEFAULT 'fixed',
    min_hours DECIMAL(5,2),
    max_hours DECIMAL(5,2),
    billing_unit INT DEFAULT 60,
    -- タイムスタンプ
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP(3) NULL,
    -- 外部キー制約
    CONSTRAINT fk_project_assignments_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_project_assignments_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_end_date ON project_assignments(end_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_assignments_active ON project_assignments(project_id, user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_project_assignments_billing_type ON project_assignments(billing_type);

-- コメント
COMMENT ON TABLE project_assignments IS 'エンジニア案件アサインテーブル';
COMMENT ON COLUMN project_assignments.project_id IS '案件ID';
COMMENT ON COLUMN project_assignments.user_id IS 'ユーザーID';
COMMENT ON COLUMN project_assignments.role IS '役割';
COMMENT ON COLUMN project_assignments.start_date IS '参画開始日';
COMMENT ON COLUMN project_assignments.end_date IS '参画終了日';
COMMENT ON COLUMN project_assignments.utilization_rate IS '稼働率（%）';
COMMENT ON COLUMN project_assignments.billing_rate IS '請求単価（この案件での単価）';
COMMENT ON COLUMN project_assignments.notes IS '備考';
COMMENT ON COLUMN project_assignments.billing_type IS '精算タイプ';
COMMENT ON COLUMN project_assignments.min_hours IS '精算下限時間';
COMMENT ON COLUMN project_assignments.max_hours IS '精算上限時間';
COMMENT ON COLUMN project_assignments.billing_unit IS '精算単位（分）';

-- トリガー
CREATE OR REPLACE TRIGGER update_project_assignments_updated_at
    BEFORE UPDATE ON project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();