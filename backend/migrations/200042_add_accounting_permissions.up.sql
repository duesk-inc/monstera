-- 経理機能権限の追加

-- ENUM型の作成
DO $$
BEGIN
    -- role_type用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accounting_role_type_enum') THEN
        CREATE TYPE accounting_role_type_enum AS ENUM ('accounting_manager', 'accounting_staff');
    END IF;
    -- scope用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_scope_enum') THEN
        CREATE TYPE permission_scope_enum AS ENUM ('all', 'owned', 'department');
    END IF;
END$$;

-- 経理関連権限をrole_permissionsテーブルに追加
INSERT INTO role_permissions (id, role, permission) VALUES 
-- スーパー管理者権限（経理機能の全権限）
(gen_random_uuid()::text, 1, 'accounting.all'),
(gen_random_uuid()::text, 1, 'accounting.dashboard.view'),
(gen_random_uuid()::text, 1, 'accounting.project_groups.manage'),
(gen_random_uuid()::text, 1, 'accounting.billing.manage'),
(gen_random_uuid()::text, 1, 'accounting.billing.preview'),
(gen_random_uuid()::text, 1, 'accounting.billing.execute'),
(gen_random_uuid()::text, 1, 'accounting.billing.approve'),
(gen_random_uuid()::text, 1, 'accounting.billing.export'),
(gen_random_uuid()::text, 1, 'accounting.freee.manage'),
(gen_random_uuid()::text, 1, 'accounting.freee.sync'),
(gen_random_uuid()::text, 1, 'accounting.invoices.view_all'),
(gen_random_uuid()::text, 1, 'accounting.invoices.update'),
(gen_random_uuid()::text, 1, 'accounting.reports.view'),
(gen_random_uuid()::text, 1, 'accounting.reports.export'),
(gen_random_uuid()::text, 1, 'accounting.scheduled_jobs.manage'),
(gen_random_uuid()::text, 1, 'accounting.sync_logs.view'),
-- 管理者権限（経理機能の管理権限）
(gen_random_uuid()::text, 2, 'accounting.dashboard.view'),
(gen_random_uuid()::text, 2, 'accounting.project_groups.manage'),
(gen_random_uuid()::text, 2, 'accounting.billing.manage'),
(gen_random_uuid()::text, 2, 'accounting.billing.preview'),
(gen_random_uuid()::text, 2, 'accounting.billing.execute'),
(gen_random_uuid()::text, 2, 'accounting.billing.approve'),
(gen_random_uuid()::text, 2, 'accounting.billing.export'),
(gen_random_uuid()::text, 2, 'accounting.freee.sync'),
(gen_random_uuid()::text, 2, 'accounting.invoices.view_all'),
(gen_random_uuid()::text, 2, 'accounting.invoices.update'),
(gen_random_uuid()::text, 2, 'accounting.reports.view'),
(gen_random_uuid()::text, 2, 'accounting.reports.export'),
(gen_random_uuid()::text, 2, 'accounting.sync_logs.view'),
-- マネージャー権限（限定的な経理機能アクセス）
(gen_random_uuid()::text, 3, 'accounting.dashboard.view'),
(gen_random_uuid()::text, 3, 'accounting.project_groups.view'),
(gen_random_uuid()::text, 3, 'accounting.billing.preview'),
(gen_random_uuid()::text, 3, 'accounting.invoices.view_own'),
(gen_random_uuid()::text, 3, 'accounting.reports.view'),
-- 経理専用ロール用の権限（将来の拡張用）
-- accounting_manager (role: 7) の権限
(gen_random_uuid()::text, 7, 'accounting.all'),
(gen_random_uuid()::text, 7, 'accounting.dashboard.view'),
(gen_random_uuid()::text, 7, 'accounting.project_groups.manage'),
(gen_random_uuid()::text, 7, 'accounting.billing.manage'),
(gen_random_uuid()::text, 7, 'accounting.billing.preview'),
(gen_random_uuid()::text, 7, 'accounting.billing.execute'),
(gen_random_uuid()::text, 7, 'accounting.billing.approve'),
(gen_random_uuid()::text, 7, 'accounting.billing.export'),
(gen_random_uuid()::text, 7, 'accounting.freee.manage'),
(gen_random_uuid()::text, 7, 'accounting.freee.sync'),
(gen_random_uuid()::text, 7, 'accounting.invoices.view_all'),
(gen_random_uuid()::text, 7, 'accounting.invoices.update'),
(gen_random_uuid()::text, 7, 'accounting.reports.view'),
(gen_random_uuid()::text, 7, 'accounting.reports.export'),
(gen_random_uuid()::text, 7, 'accounting.scheduled_jobs.manage'),
(gen_random_uuid()::text, 7, 'accounting.sync_logs.view'),
-- accounting_staff (role: 8) の権限
(gen_random_uuid()::text, 8, 'accounting.dashboard.view'),
(gen_random_uuid()::text, 8, 'accounting.project_groups.view'),
(gen_random_uuid()::text, 8, 'accounting.billing.preview'),
(gen_random_uuid()::text, 8, 'accounting.billing.export'),
(gen_random_uuid()::text, 8, 'accounting.freee.sync'),
(gen_random_uuid()::text, 8, 'accounting.invoices.view_all'),
(gen_random_uuid()::text, 8, 'accounting.invoices.update'),
(gen_random_uuid()::text, 8, 'accounting.reports.view'),
(gen_random_uuid()::text, 8, 'accounting.reports.export'),
(gen_random_uuid()::text, 8, 'accounting.sync_logs.view')
ON CONFLICT DO NOTHING;

-- 経理ロール（accounting_manager, accounting_staff）の追加
-- usersテーブルのroleカラムのコメントを更新
COMMENT ON COLUMN users.role IS '1:super_admin, 2:admin, 3:manager, 4:engineer, 5:sales_manager, 6:sales_rep, 7:accounting_manager, 8:accounting_staff';

-- default_roleカラムのコメントも更新
COMMENT ON COLUMN users.default_role IS 'ユーザーのデフォルトロール（1:super_admin, 2:admin, 3:manager, 4:engineer, 5:sales_manager, 6:sales_rep, 7:accounting_manager, 8:accounting_staff）';

-- 経理専用の詳細権限管理テーブル（将来の拡張用）
CREATE TABLE IF NOT EXISTS accounting_role_permissions (
    id VARCHAR(36) PRIMARY KEY,
    role_type accounting_role_type_enum NOT NULL,
    resource VARCHAR(100) NOT NULL, -- リソース名（project_groups, billing, freee等）
    action VARCHAR(50) NOT NULL, -- アクション（create, read, update, delete, execute等）
    scope permission_scope_enum DEFAULT 'all', -- アクセス範囲
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    CONSTRAINT uk_accounting_role_resource_action UNIQUE (role_type, resource, action)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_accounting_permissions_role ON accounting_role_permissions(role_type);

-- コメントの追加
COMMENT ON COLUMN accounting_role_permissions.resource IS 'リソース名（project_groups, billing, freee等）';
COMMENT ON COLUMN accounting_role_permissions.action IS 'アクション（create, read, update, delete, execute等）';
COMMENT ON COLUMN accounting_role_permissions.scope IS 'アクセス範囲';

-- accounting_manager の詳細権限設定
INSERT INTO accounting_role_permissions (id, role_type, resource, action, scope) VALUES 
-- プロジェクトグループ管理
(gen_random_uuid()::text, 'accounting_manager', 'project_groups', 'create', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'project_groups', 'read', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'project_groups', 'update', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'project_groups', 'delete', 'all'),
-- 請求処理管理
(gen_random_uuid()::text, 'accounting_manager', 'billing', 'preview', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'billing', 'execute', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'billing', 'approve', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'billing', 'export', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'billing', 'schedule', 'all'),
-- freee連携管理
(gen_random_uuid()::text, 'accounting_manager', 'freee', 'configure', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'freee', 'sync', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'freee', 'oauth', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'freee', 'tokens', 'all'),
-- 請求書管理
(gen_random_uuid()::text, 'accounting_manager', 'invoices', 'read', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'invoices', 'update', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'invoices', 'status_change', 'all'),
-- レポート・分析
(gen_random_uuid()::text, 'accounting_manager', 'reports', 'generate', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'reports', 'export', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'analytics', 'view', 'all'),
-- ジョブスケジュール管理
(gen_random_uuid()::text, 'accounting_manager', 'scheduled_jobs', 'create', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'scheduled_jobs', 'read', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'scheduled_jobs', 'update', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'scheduled_jobs', 'delete', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'scheduled_jobs', 'execute', 'all'),
-- 同期ログ管理
(gen_random_uuid()::text, 'accounting_manager', 'sync_logs', 'read', 'all'),
(gen_random_uuid()::text, 'accounting_manager', 'sync_logs', 'export', 'all')
ON CONFLICT DO NOTHING;

-- accounting_staff の詳細権限設定
INSERT INTO accounting_role_permissions (id, role_type, resource, action, scope) VALUES 
-- プロジェクトグループ（閲覧のみ）
(gen_random_uuid()::text, 'accounting_staff', 'project_groups', 'read', 'all'),
-- 請求処理（実行・エクスポートのみ）
(gen_random_uuid()::text, 'accounting_staff', 'billing', 'preview', 'all'),
(gen_random_uuid()::text, 'accounting_staff', 'billing', 'export', 'all'),
-- freee連携（同期のみ）
(gen_random_uuid()::text, 'accounting_staff', 'freee', 'sync', 'all'),
-- 請求書管理（閲覧・更新）
(gen_random_uuid()::text, 'accounting_staff', 'invoices', 'read', 'all'),
(gen_random_uuid()::text, 'accounting_staff', 'invoices', 'update', 'all'),
-- レポート・分析（閲覧・エクスポート）
(gen_random_uuid()::text, 'accounting_staff', 'reports', 'generate', 'all'),
(gen_random_uuid()::text, 'accounting_staff', 'reports', 'export', 'all'),
(gen_random_uuid()::text, 'accounting_staff', 'analytics', 'view', 'all'),
-- ジョブスケジュール（閲覧のみ）
(gen_random_uuid()::text, 'accounting_staff', 'scheduled_jobs', 'read', 'all'),
-- 同期ログ（閲覧のみ）
(gen_random_uuid()::text, 'accounting_staff', 'sync_logs', 'read', 'all')
ON CONFLICT DO NOTHING;

-- 経理部門管理テーブル（将来の拡張用）
CREATE TABLE IF NOT EXISTS accounting_departments (
    id VARCHAR(36) PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    manager_id VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_accounting_dept_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_accounting_dept_manager ON accounting_departments(manager_id);

-- 経理部門メンバーテーブル
CREATE TABLE IF NOT EXISTS accounting_department_members (
    department_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    role_type accounting_role_type_enum NOT NULL,
    joined_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    PRIMARY KEY (department_id, user_id),
    CONSTRAINT fk_accounting_dept_members_dept FOREIGN KEY (department_id) REFERENCES accounting_departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_accounting_dept_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_accounting_dept_members_user ON accounting_department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_dept_members_role ON accounting_department_members(role_type);


-- Triggers for automatic timestamp updates

-- Trigger for accounting_role_permissions table
DROP TRIGGER IF EXISTS update_accounting_role_permissions_updated_at ON accounting_role_permissions;
CREATE TRIGGER update_accounting_role_permissions_updated_at
    BEFORE UPDATE ON accounting_role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for accounting_departments table
DROP TRIGGER IF EXISTS update_accounting_departments_updated_at ON accounting_departments;
CREATE TRIGGER update_accounting_departments_updated_at
    BEFORE UPDATE ON accounting_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 注: accounting_department_membersテーブルには updated_at カラムがないため、トリガーは不要