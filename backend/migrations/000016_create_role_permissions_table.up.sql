-- 権限詳細管理テーブルの作成（数値型ロール対応版）
CREATE TABLE IF NOT EXISTS role_permissions (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  role TINYINT NOT NULL COMMENT '1:super_admin, 2:admin, 3:manager, 4:employee',
  permission VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '権限名',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
  deleted_at DATETIME(3) NULL COMMENT '削除日時',
  UNIQUE INDEX idx_role_permissions_role_permission (role, permission)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ロール権限管理テーブル';

-- 初期権限データの投入（数値型ロール）
INSERT INTO role_permissions (id, role, permission) VALUES
  -- スーパー管理者権限
  (UUID(), 1, 'system.all'),
  (UUID(), 1, 'weekly_reports.view_all'),
  (UUID(), 1, 'weekly_reports.comment'),
  (UUID(), 1, 'attendance.approve'),
  (UUID(), 1, 'expenses.approve'),
  (UUID(), 1, 'invoices.manage'),
  (UUID(), 1, 'sales.manage'),
  (UUID(), 1, 'engineers.view_all'),
  (UUID(), 1, 'dashboard.view'),
  -- 管理者権限
  (UUID(), 2, 'weekly_reports.view_all'),
  (UUID(), 2, 'weekly_reports.comment'),
  (UUID(), 2, 'attendance.approve'),
  (UUID(), 2, 'expenses.approve'),
  (UUID(), 2, 'invoices.manage'),
  (UUID(), 2, 'sales.manage'),
  (UUID(), 2, 'engineers.view_all'),
  (UUID(), 2, 'dashboard.view'),
  -- 一般社員権限
  (UUID(), 4, 'weekly_reports.view_own'),
  (UUID(), 4, 'attendance.submit'),
  (UUID(), 4, 'expenses.submit');