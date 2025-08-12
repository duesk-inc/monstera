-- employee ロールを engineer に名称変更
-- 数値は変更せず、説明のみを更新

-- usersテーブルのroleカラムのコメントを更新
COMMENT ON COLUMN users.role IS '1:super_admin, 2:admin, 3:manager, 4:engineer, 5:sales_manager, 6:sales_rep, 7:accounting_manager, 8:accounting_staff';

-- default_roleカラムのコメントも更新
COMMENT ON COLUMN users.default_role IS 'ユーザーのデフォルトロール（1:super_admin, 2:admin, 3:manager, 4:engineer, 5:sales_manager, 6:sales_rep, 7:accounting_manager, 8:accounting_staff）';

-- 統計情報: この変更は表示名のみの変更で、データやロジックには影響しません
-- employee（役割値4）はengineer（役割値4）として解釈されるようになります