-- 権限詳細管理テーブルの作成（数値型ロール対応版）
CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR(36) PRIMARY KEY,
    role SMALLINT NOT NULL, -- 1:super_admin, 2:admin, 3:manager, 4:employee
    permission VARCHAR(100) NOT NULL, -- 権限名
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 作成日時
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'), -- 更新日時
    deleted_at TIMESTAMP(3) NULL -- 削除日時
);

-- Unique index
CREATE UNIQUE INDEX idx_role_permissions_role_permission ON role_permissions(role, permission);

-- Table comment
COMMENT ON TABLE role_permissions IS 'ロール権限管理テーブル';
-- 初期権限データの投入（数値型ロール）
INSERT INTO role_permissions (id, role, permission) VALUES 
-- スーパー管理者権限
(gen_random_uuid()::text, 1, 'system.all'),
(gen_random_uuid()::text, 1, 'weekly_reports.view_all'),
(gen_random_uuid()::text, 1, 'weekly_reports.comment'),
(gen_random_uuid()::text, 1, 'attendance.approve'),
(gen_random_uuid()::text, 1, 'expenses.approve'),
(gen_random_uuid()::text, 1, 'invoices.manage'),
(gen_random_uuid()::text, 1, 'sales.manage'),
(gen_random_uuid()::text, 1, 'engineers.view_all'),
(gen_random_uuid()::text, 1, 'dashboard.view'),
-- 管理者権限
(gen_random_uuid()::text, 2, 'weekly_reports.view_all'),
(gen_random_uuid()::text, 2, 'weekly_reports.comment'),
(gen_random_uuid()::text, 2, 'attendance.approve'),
(gen_random_uuid()::text, 2, 'expenses.approve'),
(gen_random_uuid()::text, 2, 'invoices.manage'),
(gen_random_uuid()::text, 2, 'sales.manage'),
(gen_random_uuid()::text, 2, 'engineers.view_all'),
(gen_random_uuid()::text, 2, 'dashboard.view'),
-- 一般社員権限
(gen_random_uuid()::text, 4, 'weekly_reports.view_own'),
(gen_random_uuid()::text, 4, 'attendance.submit'),
(gen_random_uuid()::text, 4, 'expenses.submit');


-- Triggers for automatic timestamp updates

-- Trigger for role_permissions table
CREATE OR REPLACE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
