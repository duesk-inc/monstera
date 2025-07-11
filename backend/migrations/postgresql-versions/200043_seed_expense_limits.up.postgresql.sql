-- 経費申請上限の初期値設定（PostgreSQL版）
-- 月次上限: 50,000円（一般的な経費申請の月次上限）
-- 年次上限: 600,000円（月次上限の12ヶ月分）

DO $$
DECLARE
    admin_id UUID;
    monthly_exists INTEGER;
    yearly_exists INTEGER;
    result_message TEXT;
BEGIN
    -- 管理者ユーザーの存在確認
    SELECT id INTO admin_id FROM users WHERE role = 2 ORDER BY created_at ASC LIMIT 1;

    -- 管理者が存在しない場合は、最初に作成されたユーザーを使用
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM users ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- 既存の上限設定を確認
    SELECT COUNT(*) INTO monthly_exists FROM expense_limits WHERE limit_type = 'monthly';
    SELECT COUNT(*) INTO yearly_exists FROM expense_limits WHERE limit_type = 'yearly';

    -- 月次上限の設定（存在しない場合のみ）
    IF monthly_exists = 0 AND admin_id IS NOT NULL THEN
        INSERT INTO expense_limits (id, limit_type, amount, effective_from, created_by, created_at, updated_at)
        VALUES (
            gen_random_uuid()::text,
            'monthly',
            50000,  -- 5万円
            CURRENT_TIMESTAMP,
            admin_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END IF;

    -- 年次上限の設定（存在しない場合のみ）
    IF yearly_exists = 0 AND admin_id IS NOT NULL THEN
        INSERT INTO expense_limits (id, limit_type, amount, effective_from, created_by, created_at, updated_at)
        VALUES (
            gen_random_uuid()::text,
            'yearly',
            600000,  -- 60万円
            CURRENT_TIMESTAMP,
            admin_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END IF;

    -- 設定完了のメッセージ
    IF admin_id IS NULL THEN
        result_message := 'Warning: No users found to set as creator';
    ELSIF monthly_exists > 0 AND yearly_exists > 0 THEN
        result_message := 'Expense limits already exist, skipping initialization';
    ELSE
        result_message := 'Expense limits initialized successfully';
    END IF;

    RAISE NOTICE '%', result_message;
END $$;