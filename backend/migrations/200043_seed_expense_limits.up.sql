-- 経費申請上限の初期値設定
-- 月次上限: 50,000円（一般的な経費申請の月次上限）
-- 年次上限: 600,000円（月次上限の12ヶ月分）

-- 管理者ユーザーの存在確認
SET @admin_id = (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1);

-- 管理者が存在しない場合は、最初に作成されたユーザーを使用
SET @admin_id = IFNULL(@admin_id, (SELECT id FROM users ORDER BY created_at ASC LIMIT 1));

-- 既存の上限設定を確認
SET @monthly_exists = (SELECT COUNT(*) FROM expense_limits WHERE limit_type = 'monthly');
SET @yearly_exists = (SELECT COUNT(*) FROM expense_limits WHERE limit_type = 'yearly');

-- 月次上限の設定（存在しない場合のみ）
INSERT INTO expense_limits (id, limit_type, amount, effective_from, created_by, created_at, updated_at)
SELECT 
    UUID(),
    'monthly',
    50000,  -- 5万円
    NOW(),
    @admin_id,
    NOW(),
    NOW()
WHERE @monthly_exists = 0 AND @admin_id IS NOT NULL;

-- 年次上限の設定（存在しない場合のみ）
INSERT INTO expense_limits (id, limit_type, amount, effective_from, created_by, created_at, updated_at)
SELECT 
    UUID(),
    'yearly',
    600000,  -- 60万円
    NOW(),
    @admin_id,
    NOW(),
    NOW()
WHERE @yearly_exists = 0 AND @admin_id IS NOT NULL;

-- 設定完了のメッセージ
SELECT 
    CASE 
        WHEN @admin_id IS NULL THEN 'Warning: No users found to set as creator'
        WHEN @monthly_exists > 0 AND @yearly_exists > 0 THEN 'Expense limits already exist, skipping initialization'
        ELSE 'Expense limits initialized successfully'
    END AS result;