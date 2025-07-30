-- テーブルの削除
DROP TABLE IF EXISTS sales_team_members;
DROP TABLE IF EXISTS sales_teams;
DROP TABLE IF EXISTS sales_role_permissions;

-- usersテーブルのroleカラムのコメントを元に戻す
ALTER TABLE users 
MODIFY COLUMN role TINYINT NOT NULL DEFAULT 4 
COMMENT '1:super_admin, 2:admin, 3:manager, 4:employee';

-- default_roleカラムのコメントも元に戻す
ALTER TABLE users 
MODIFY COLUMN default_role TINYINT NULL 
COMMENT 'ユーザーのデフォルトロール（1:super_admin, 2:admin, 3:manager, 4:employee）';