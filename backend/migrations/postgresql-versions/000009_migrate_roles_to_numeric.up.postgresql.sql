-- ロールを数値型に移行するマイグレーション（修正版）
-- このマイグレーションは既に適用済みの場合はスキップする

-- roleカラムが既にSMALLINT型の場合は何もしない
DO $$
BEGIN
    -- roleカラムのデータ型を確認
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role' 
        AND data_type = 'smallint'
    ) THEN
        -- 既にSMALLINT型の場合はコメントだけ更新
        COMMENT ON COLUMN users.role IS '1:super_admin, 2:admin, 3:manager, 4:employee';
    ELSE
        -- VARCHAR型の場合は移行処理を実行
        -- 1. 一時カラムを追加
        ALTER TABLE users ADD COLUMN role_numeric SMALLINT;

        -- 2. 既存のロールデータを数値に変換してコピー
        UPDATE users SET role_numeric = CASE 
            WHEN role = 'admin' THEN 2 
            WHEN role = 'manager' THEN 3 
            WHEN role = 'employee' THEN 4 
            WHEN role = 'user' THEN 4 -- 旧仕様の'user'は'employee'として扱う
            ELSE 4 -- デフォルトは一般社員
        END;

        -- 3. 元のroleカラムを削除
        ALTER TABLE users DROP COLUMN role;

        -- 4. role_numericカラムの名前をroleに変更し、NOT NULL制約とデフォルト値を設定
        ALTER TABLE users RENAME COLUMN role_numeric TO role;
        ALTER TABLE users ALTER COLUMN role SET NOT NULL;
        ALTER TABLE users ALTER COLUMN role SET DEFAULT 4;

        -- 5. インデックスの再作成
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

        -- 6. コメントを追加
        COMMENT ON COLUMN users.role IS '1:super_admin, 2:admin, 3:manager, 4:employee';
    END IF;
END $$;
