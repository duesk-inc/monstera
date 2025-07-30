-- project_assignmentsテーブルから請求精算用カラムを削除
ALTER TABLE project_assignments 
    DROP COLUMN billing_type,
    DROP COLUMN min_hours,
    DROP COLUMN max_hours,
    DROP COLUMN billing_unit,
    DROP INDEX idx_project_assignments_billing_type;