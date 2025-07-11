-- project_assignmentsテーブルに請求精算用カラムを追加
ALTER TABLE project_assignments 
    ADD COLUMN billing_type ENUM('fixed', 'variable_upper_lower', 'variable_middle') DEFAULT 'fixed' COMMENT '精算タイプ',
    ADD COLUMN min_hours DECIMAL(5,2) COMMENT '精算下限時間',
    ADD COLUMN max_hours DECIMAL(5,2) COMMENT '精算上限時間',
    ADD COLUMN billing_unit INT DEFAULT 60 COMMENT '精算単位（分）',
    ADD INDEX idx_project_assignments_billing_type (billing_type);