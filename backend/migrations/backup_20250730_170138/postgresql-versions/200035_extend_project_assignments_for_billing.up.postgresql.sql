-- project_assignmentsテーブルに請求精算用カラムを追加（PostgreSQL版）

-- billing_typeのENUM型を作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type_enum') THEN
        CREATE TYPE billing_type_enum AS ENUM ('fixed', 'variable_upper_lower', 'variable_middle');
    END IF;
END $$;

-- カラムの追加
ALTER TABLE project_assignments 
    ADD COLUMN IF NOT EXISTS billing_type billing_type_enum DEFAULT 'fixed', -- 精算タイプ
    ADD COLUMN IF NOT EXISTS min_hours DECIMAL(5,2), -- 精算下限時間
    ADD COLUMN IF NOT EXISTS max_hours DECIMAL(5,2), -- 精算上限時間
    ADD COLUMN IF NOT EXISTS billing_unit INT DEFAULT 60; -- 精算単位（分）

-- コメントの追加
COMMENT ON COLUMN project_assignments.billing_type IS '精算タイプ';
COMMENT ON COLUMN project_assignments.min_hours IS '精算下限時間';
COMMENT ON COLUMN project_assignments.max_hours IS '精算上限時間';
COMMENT ON COLUMN project_assignments.billing_unit IS '精算単位（分）';

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_project_assignments_billing_type ON project_assignments(billing_type);