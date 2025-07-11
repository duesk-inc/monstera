-- DEFERRABLE制約を通常の制約に戻す

-- =====================================
-- departments テーブルの制約
-- =====================================

ALTER TABLE departments 
DROP CONSTRAINT IF EXISTS fk_departments_parent;

ALTER TABLE departments 
ADD CONSTRAINT fk_departments_parent 
FOREIGN KEY (parent_id) REFERENCES departments(id) 
ON DELETE SET NULL;

ALTER TABLE departments 
DROP CONSTRAINT IF EXISTS fk_departments_manager;

ALTER TABLE departments 
ADD CONSTRAINT fk_departments_manager 
FOREIGN KEY (manager_id) REFERENCES users(id) 
ON DELETE SET NULL;

-- =====================================
-- users テーブルの制約
-- =====================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'department_id'
    ) THEN
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_department';
        
        EXECUTE 'ALTER TABLE users ADD CONSTRAINT fk_users_department 
                 FOREIGN KEY (department_id) REFERENCES departments(id) 
                 ON DELETE SET NULL';
    END IF;
END $$;

-- =====================================
-- project_assignments テーブルの制約
-- =====================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'project_assignments'
    ) THEN
        EXECUTE 'ALTER TABLE project_assignments 
                 DROP CONSTRAINT IF EXISTS fk_assignments_project';
        
        EXECUTE 'ALTER TABLE project_assignments 
                 ADD CONSTRAINT fk_assignments_project 
                 FOREIGN KEY (project_id) REFERENCES projects(id) 
                 ON DELETE CASCADE';
    END IF;
END $$;

-- =====================================
-- expense_approver_settings テーブルの制約
-- =====================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'expense_approver_settings'
    ) THEN
        EXECUTE 'ALTER TABLE expense_approver_settings 
                 DROP CONSTRAINT IF EXISTS fk_approver_settings_approver';
        
        EXECUTE 'ALTER TABLE expense_approver_settings 
                 ADD CONSTRAINT fk_approver_settings_approver 
                 FOREIGN KEY (approver_id) REFERENCES users(id) 
                 ON DELETE CASCADE';
    END IF;
END $$;