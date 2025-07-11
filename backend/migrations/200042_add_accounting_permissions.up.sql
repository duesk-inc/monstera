-- 経理機能権限の追加
-- 経理機能に関連する権限を role_permissions テーブルに追加

-- 経理関連権限をrole_permissionsテーブルに追加
INSERT INTO role_permissions (id, role, permission) VALUES
  -- スーパー管理者権限（経理機能の全権限）
  (UUID(), 1, 'accounting.all'),
  (UUID(), 1, 'accounting.dashboard.view'),
  (UUID(), 1, 'accounting.project_groups.manage'),
  (UUID(), 1, 'accounting.billing.manage'),
  (UUID(), 1, 'accounting.billing.preview'),
  (UUID(), 1, 'accounting.billing.execute'),
  (UUID(), 1, 'accounting.billing.approve'),
  (UUID(), 1, 'accounting.billing.export'),
  (UUID(), 1, 'accounting.freee.manage'),
  (UUID(), 1, 'accounting.freee.sync'),
  (UUID(), 1, 'accounting.invoices.view_all'),
  (UUID(), 1, 'accounting.invoices.update'),
  (UUID(), 1, 'accounting.reports.view'),
  (UUID(), 1, 'accounting.reports.export'),
  (UUID(), 1, 'accounting.scheduled_jobs.manage'),
  (UUID(), 1, 'accounting.sync_logs.view'),
  
  -- 管理者権限（経理機能の管理権限）
  (UUID(), 2, 'accounting.dashboard.view'),
  (UUID(), 2, 'accounting.project_groups.manage'),
  (UUID(), 2, 'accounting.billing.manage'),
  (UUID(), 2, 'accounting.billing.preview'),
  (UUID(), 2, 'accounting.billing.execute'),
  (UUID(), 2, 'accounting.billing.approve'),
  (UUID(), 2, 'accounting.billing.export'),
  (UUID(), 2, 'accounting.freee.sync'),
  (UUID(), 2, 'accounting.invoices.view_all'),
  (UUID(), 2, 'accounting.invoices.update'),
  (UUID(), 2, 'accounting.reports.view'),
  (UUID(), 2, 'accounting.reports.export'),
  (UUID(), 2, 'accounting.sync_logs.view'),
  
  -- マネージャー権限（限定的な経理機能アクセス）
  (UUID(), 3, 'accounting.dashboard.view'),
  (UUID(), 3, 'accounting.project_groups.view'),
  (UUID(), 3, 'accounting.billing.preview'),
  (UUID(), 3, 'accounting.invoices.view_own'),
  (UUID(), 3, 'accounting.reports.view'),
  
  -- 経理専用ロール用の権限（将来の拡張用）
  -- accounting_manager (role: 7) の権限
  (UUID(), 7, 'accounting.all'),
  (UUID(), 7, 'accounting.dashboard.view'),
  (UUID(), 7, 'accounting.project_groups.manage'),
  (UUID(), 7, 'accounting.billing.manage'),
  (UUID(), 7, 'accounting.billing.preview'),
  (UUID(), 7, 'accounting.billing.execute'),
  (UUID(), 7, 'accounting.billing.approve'),
  (UUID(), 7, 'accounting.billing.export'),
  (UUID(), 7, 'accounting.freee.manage'),
  (UUID(), 7, 'accounting.freee.sync'),
  (UUID(), 7, 'accounting.invoices.view_all'),
  (UUID(), 7, 'accounting.invoices.update'),
  (UUID(), 7, 'accounting.reports.view'),
  (UUID(), 7, 'accounting.reports.export'),
  (UUID(), 7, 'accounting.scheduled_jobs.manage'),
  (UUID(), 7, 'accounting.sync_logs.view'),
  
  -- accounting_staff (role: 8) の権限
  (UUID(), 8, 'accounting.dashboard.view'),
  (UUID(), 8, 'accounting.project_groups.view'),
  (UUID(), 8, 'accounting.billing.preview'),
  (UUID(), 8, 'accounting.billing.export'),
  (UUID(), 8, 'accounting.freee.sync'),
  (UUID(), 8, 'accounting.invoices.view_all'),
  (UUID(), 8, 'accounting.invoices.update'),
  (UUID(), 8, 'accounting.reports.view'),
  (UUID(), 8, 'accounting.reports.export'),
  (UUID(), 8, 'accounting.sync_logs.view');

-- 経理ロール（accounting_manager, accounting_staff）の追加
-- usersテーブルのroleカラムのコメントを更新
ALTER TABLE users 
MODIFY COLUMN role TINYINT NOT NULL DEFAULT 4 
COMMENT '1:super_admin, 2:admin, 3:manager, 4:employee, 5:sales_manager, 6:sales_rep, 7:accounting_manager, 8:accounting_staff';

-- default_roleカラムのコメントも更新
ALTER TABLE users 
MODIFY COLUMN default_role TINYINT NULL 
COMMENT 'ユーザーのデフォルトロール（1:super_admin, 2:admin, 3:manager, 4:employee, 5:sales_manager, 6:sales_rep, 7:accounting_manager, 8:accounting_staff）';

-- 経理専用の詳細権限管理テーブル（将来の拡張用）
CREATE TABLE IF NOT EXISTS accounting_role_permissions (
    id VARCHAR(36) PRIMARY KEY,
    role_type ENUM('accounting_manager', 'accounting_staff') NOT NULL,
    resource VARCHAR(100) NOT NULL COMMENT 'リソース名（project_groups, billing, freee等）',
    action VARCHAR(50) NOT NULL COMMENT 'アクション（create, read, update, delete, execute等）',
    scope ENUM('all', 'owned', 'department') DEFAULT 'all' COMMENT 'アクセス範囲',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_accounting_role_resource_action (role_type, resource, action),
    INDEX idx_accounting_permissions_role (role_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- accounting_manager の詳細権限設定
INSERT INTO accounting_role_permissions (id, role_type, resource, action, scope) VALUES
-- プロジェクトグループ管理
(UUID(), 'accounting_manager', 'project_groups', 'create', 'all'),
(UUID(), 'accounting_manager', 'project_groups', 'read', 'all'),
(UUID(), 'accounting_manager', 'project_groups', 'update', 'all'),
(UUID(), 'accounting_manager', 'project_groups', 'delete', 'all'),

-- 請求処理管理
(UUID(), 'accounting_manager', 'billing', 'preview', 'all'),
(UUID(), 'accounting_manager', 'billing', 'execute', 'all'),
(UUID(), 'accounting_manager', 'billing', 'approve', 'all'),
(UUID(), 'accounting_manager', 'billing', 'export', 'all'),
(UUID(), 'accounting_manager', 'billing', 'schedule', 'all'),

-- freee連携管理
(UUID(), 'accounting_manager', 'freee', 'configure', 'all'),
(UUID(), 'accounting_manager', 'freee', 'sync', 'all'),
(UUID(), 'accounting_manager', 'freee', 'oauth', 'all'),
(UUID(), 'accounting_manager', 'freee', 'tokens', 'all'),

-- 請求書管理
(UUID(), 'accounting_manager', 'invoices', 'read', 'all'),
(UUID(), 'accounting_manager', 'invoices', 'update', 'all'),
(UUID(), 'accounting_manager', 'invoices', 'status_change', 'all'),

-- レポート・分析
(UUID(), 'accounting_manager', 'reports', 'generate', 'all'),
(UUID(), 'accounting_manager', 'reports', 'export', 'all'),
(UUID(), 'accounting_manager', 'analytics', 'view', 'all'),

-- ジョブスケジュール管理
(UUID(), 'accounting_manager', 'scheduled_jobs', 'create', 'all'),
(UUID(), 'accounting_manager', 'scheduled_jobs', 'read', 'all'),
(UUID(), 'accounting_manager', 'scheduled_jobs', 'update', 'all'),
(UUID(), 'accounting_manager', 'scheduled_jobs', 'delete', 'all'),
(UUID(), 'accounting_manager', 'scheduled_jobs', 'execute', 'all'),

-- 同期ログ管理
(UUID(), 'accounting_manager', 'sync_logs', 'read', 'all'),
(UUID(), 'accounting_manager', 'sync_logs', 'export', 'all');

-- accounting_staff の詳細権限設定
INSERT INTO accounting_role_permissions (id, role_type, resource, action, scope) VALUES
-- プロジェクトグループ（閲覧のみ）
(UUID(), 'accounting_staff', 'project_groups', 'read', 'all'),

-- 請求処理（実行・エクスポートのみ）
(UUID(), 'accounting_staff', 'billing', 'preview', 'all'),
(UUID(), 'accounting_staff', 'billing', 'export', 'all'),

-- freee連携（同期のみ）
(UUID(), 'accounting_staff', 'freee', 'sync', 'all'),

-- 請求書管理（閲覧・更新）
(UUID(), 'accounting_staff', 'invoices', 'read', 'all'),
(UUID(), 'accounting_staff', 'invoices', 'update', 'all'),

-- レポート・分析（閲覧・エクスポート）
(UUID(), 'accounting_staff', 'reports', 'generate', 'all'),
(UUID(), 'accounting_staff', 'reports', 'export', 'all'),
(UUID(), 'accounting_staff', 'analytics', 'view', 'all'),

-- ジョブスケジュール（閲覧のみ）
(UUID(), 'accounting_staff', 'scheduled_jobs', 'read', 'all'),

-- 同期ログ（閲覧のみ）
(UUID(), 'accounting_staff', 'sync_logs', 'read', 'all');

-- 経理部門管理テーブル（将来の拡張用）
CREATE TABLE IF NOT EXISTS accounting_departments (
    id VARCHAR(36) PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    manager_id VARCHAR(36) NOT NULL,
    description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    CONSTRAINT fk_accounting_dept_manager FOREIGN KEY (manager_id) 
        REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_accounting_dept_manager (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 経理部門メンバーテーブル
CREATE TABLE IF NOT EXISTS accounting_department_members (
    department_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role_type ENUM('accounting_manager', 'accounting_staff') NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (department_id, user_id),
    
    CONSTRAINT fk_accounting_dept_members_dept FOREIGN KEY (department_id) 
        REFERENCES accounting_departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_accounting_dept_members_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_accounting_dept_members_user (user_id),
    INDEX idx_accounting_dept_members_role (role_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;