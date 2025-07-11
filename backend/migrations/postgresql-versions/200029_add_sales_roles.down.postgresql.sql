-- テーブルの削除
DROP TABLE IF EXISTS sales_team_members;
DROP TABLE IF EXISTS sales_teams;
DROP TABLE IF EXISTS sales_role_permissions;

-- ENUM型の削除
DROP TYPE IF EXISTS sales_role_type_enum;
DROP TYPE IF EXISTS access_scope_enum;

-- usersテーブルのroleカラムのコメントを元に戻す
COMMENT ON COLUMN users.role IS '1:super_admin, 2:admin, 3:manager, 4:employee';

-- default_roleカラムのコメントも元に戻す
COMMENT ON COLUMN users.default_role IS 'ユーザーのデフォルトロール（1:super_admin, 2:admin, 3:manager, 4:employee）';