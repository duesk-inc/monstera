-- PostgreSQL DEFERRABLE制約の追加
-- 循環参照や複雑なデータ操作を可能にするための制約設定

-- =====================================
-- departments テーブルの自己参照制約
-- =====================================

-- 既存の制約を削除して再作成
ALTER TABLE departments 
DROP CONSTRAINT IF EXISTS fk_departments_parent;

ALTER TABLE departments 
ADD CONSTRAINT fk_departments_parent 
FOREIGN KEY (parent_id) REFERENCES departments(id) 
ON DELETE SET NULL
DEFERRABLE INITIALLY IMMEDIATE;

-- =====================================
-- users ⇄ departments の相互参照制約
-- =====================================

-- departments.manager_id → users.id
ALTER TABLE departments 
DROP CONSTRAINT IF EXISTS fk_departments_manager;

ALTER TABLE departments 
ADD CONSTRAINT fk_departments_manager 
FOREIGN KEY (manager_id) REFERENCES users(id) 
ON DELETE SET NULL
DEFERRABLE INITIALLY IMMEDIATE;

-- users.department_id → departments.id (存在する場合)
-- 注: usersテーブルにdepartment_idがある場合のみ実行
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'department_id'
    ) THEN
        -- 既存の制約を削除
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_department';
        
        -- DEFERRABLE制約として再作成
        EXECUTE 'ALTER TABLE users ADD CONSTRAINT fk_users_department 
                 FOREIGN KEY (department_id) REFERENCES departments(id) 
                 ON DELETE SET NULL
                 DEFERRABLE INITIALLY IMMEDIATE';
    END IF;
END $$;

-- =====================================
-- プロジェクト関連の制約（オプション）
-- =====================================

-- project_assignments → projects
-- 大量のアサインメント更新時に有用
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
                 ON DELETE CASCADE
                 DEFERRABLE INITIALLY IMMEDIATE';
    END IF;
END $$;

-- =====================================
-- 承認フロー関連の制約（オプション）
-- =====================================

-- expense_approver_settings → users
-- 承認者の一括変更時に有用
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
                 ON DELETE CASCADE
                 DEFERRABLE INITIALLY IMMEDIATE';
    END IF;
END $$;

-- =====================================
-- 使用例のコメント
-- =====================================

-- DEFERRABLE制約の使用例:
-- 
-- 1. 部署の再編成
-- BEGIN;
-- SET CONSTRAINTS fk_departments_parent DEFERRED;
-- -- 一時的に親子関係を解除
-- UPDATE departments SET parent_id = NULL WHERE parent_id IS NOT NULL;
-- -- 新しい階層構造を設定
-- UPDATE departments SET parent_id = '新親部署ID' WHERE id IN ('子部署ID1', '子部署ID2');
-- COMMIT; -- ここで制約チェック
--
-- 2. ユーザーと部署の相互更新
-- BEGIN;
-- SET CONSTRAINTS fk_users_department, fk_departments_manager DEFERRED;
-- -- 部署とマネージャーを同時に設定
-- INSERT INTO departments (id, name, manager_id) VALUES ('dept-1', '新部署', 'user-1');
-- INSERT INTO users (id, name, department_id) VALUES ('user-1', '新マネージャー', 'dept-1');
-- COMMIT; -- ここで制約チェック
--
-- 3. すべてのDEFERRABLE制約を一時的に遅延
-- BEGIN;
-- SET CONSTRAINTS ALL DEFERRED;
-- -- 複雑なデータ操作
-- COMMIT;