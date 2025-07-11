-- ロールを数値型に移行するマイグレーション（修正版）
-- role_permissions テーブルは migration 16 で作成されるので、ここでは users テーブルのみ処理

-- 1. 一時カラムを追加
ALTER TABLE users ADD COLUMN role_numeric TINYINT AFTER role;

-- 2. 既存のロールデータを数値に変換してコピー
UPDATE users SET role_numeric = CASE
    WHEN role = 'admin' THEN 2
    WHEN role = 'manager' THEN 3
    WHEN role = 'employee' THEN 4
    WHEN role = 'user' THEN 4  -- 旧仕様の'user'は'employee'として扱う
    ELSE 4  -- デフォルトは一般社員
END;

-- 3. 元のroleカラムを削除
ALTER TABLE users DROP COLUMN role;

-- 4. role_numericカラムの名前をroleに変更
ALTER TABLE users CHANGE COLUMN role_numeric role TINYINT NOT NULL DEFAULT 4;

-- 5. インデックスの再作成
ALTER TABLE users ADD INDEX idx_users_role (role);

-- 6. コメントを追加
ALTER TABLE users MODIFY COLUMN role TINYINT NOT NULL DEFAULT 4 COMMENT '1:super_admin, 2:admin, 3:manager, 4:employee';