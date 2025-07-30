-- ロールを文字列型に戻すマイグレーション

-- 1. 一時カラムを追加
ALTER TABLE users ADD COLUMN role_string VARCHAR(20) AFTER role;
ALTER TABLE role_permissions ADD COLUMN role_string VARCHAR(50) AFTER role;

-- 2. 数値データを文字列に変換してコピー
UPDATE users SET role_string = CASE
    WHEN role = 1 THEN 'admin'  -- super_adminはadminとして戻す
    WHEN role = 2 THEN 'admin'
    WHEN role = 3 THEN 'manager'
    WHEN role = 4 THEN 'employee'
    ELSE 'employee'
END;

UPDATE role_permissions SET role_string = CASE
    WHEN role = 1 THEN 'admin'
    WHEN role = 2 THEN 'admin'
    WHEN role = 3 THEN 'manager'
    WHEN role = 4 THEN 'user'
    ELSE 'user'
END;

-- 3. 元のroleカラムを削除
ALTER TABLE users DROP COLUMN role;
ALTER TABLE role_permissions DROP COLUMN role;

-- 4. role_stringカラムの名前をroleに変更
ALTER TABLE users CHANGE COLUMN role_string role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE role_permissions CHANGE COLUMN role_string role VARCHAR(50) NOT NULL;

-- 5. インデックスの再作成
ALTER TABLE users DROP INDEX idx_users_role;
ALTER TABLE role_permissions DROP INDEX idx_role_permissions_role_permission;
ALTER TABLE role_permissions ADD UNIQUE INDEX idx_role_permissions_role_permission (role, permission);

-- 6. スーパー管理者権限のレコードを削除（role = 1のレコード）
DELETE FROM role_permissions WHERE role = 'admin' AND permission = 'system.all';

-- 7. コメントを削除
ALTER TABLE users MODIFY COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE role_permissions MODIFY COLUMN role VARCHAR(50) NOT NULL;