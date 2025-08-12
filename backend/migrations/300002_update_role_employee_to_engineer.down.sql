-- engineer ロールを employee に戻す（ロールバック）

-- usersテーブルのroleカラムのコメントを元に戻す
COMMENT ON COLUMN users.role IS '1:super_admin, 2:admin, 3:manager, 4:employee, 5:sales_manager, 6:sales_rep, 7:accounting_manager, 8:accounting_staff';

-- default_roleカラムのコメントも元に戻す
COMMENT ON COLUMN users.default_role IS 'ユーザーのデフォルトロール（1:super_admin, 2:admin, 3:manager, 4:employee, 5:sales_manager, 6:sales_rep, 7:accounting_manager, 8:accounting_staff）';