-- 経理機能権限の削除（ロールバック用）

-- 経理部門関連テーブルの削除
DROP TABLE IF EXISTS accounting_department_members;
DROP TABLE IF EXISTS accounting_departments;

-- 経理ロール権限詳細テーブルの削除
DROP TABLE IF EXISTS accounting_role_permissions;

-- role_permissions テーブルから経理関連権限を削除
DELETE FROM role_permissions WHERE permission LIKE 'accounting.%';

-- usersテーブルのroleカラムのコメントを元に戻す
ALTER TABLE users 
MODIFY COLUMN role TINYINT NOT NULL DEFAULT 4 
COMMENT '1:super_admin, 2:admin, 3:manager, 4:employee, 5:sales_manager, 6:sales_rep';

-- default_roleカラムのコメントも元に戻す
ALTER TABLE users 
MODIFY COLUMN default_role TINYINT NULL 
COMMENT 'ユーザーのデフォルトロール（1:super_admin, 2:admin, 3:manager, 4:employee, 5:sales_manager, 6:sales_rep）';