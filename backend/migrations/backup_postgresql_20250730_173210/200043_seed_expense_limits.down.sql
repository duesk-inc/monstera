-- 初期設定の経費申請上限を削除
-- 注意: 他のユーザーが作成した上限設定は削除しません

-- 管理者ユーザーの特定
SET @admin_id = (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1);
SET @admin_id = IFNULL(@admin_id, (SELECT id FROM users ORDER BY created_at ASC LIMIT 1));

-- 初期設定の月次上限（50,000円）を削除
DELETE FROM expense_limits 
WHERE limit_type = 'monthly' 
  AND amount = 50000 
  AND created_by = @admin_id;

-- 初期設定の年次上限（600,000円）を削除  
DELETE FROM expense_limits 
WHERE limit_type = 'yearly' 
  AND amount = 600000 
  AND created_by = @admin_id;

-- 結果の確認
SELECT 
    CASE 
        WHEN @admin_id IS NULL THEN 'Warning: No admin user found'
        ELSE 'Initial expense limits removed successfully'
    END AS result;