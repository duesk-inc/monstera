-- 経費申請承認者設定の投入スクリプト
-- 管理部承認者と役員承認者を設定します

-- admin@duesk.co.jp を管理部承認者として設定
INSERT INTO expense_approver_settings (id, approval_type, approver_id, is_active, priority, created_by)
VALUES (
    gen_random_uuid(),
    'manager',
    '3bb73c7d-4086-4304-a918-3d871c98ddc9', -- admin@duesk.co.jpのID
    true,
    1,
    '3bb73c7d-4086-4304-a918-3d871c98ddc9'
);

-- admin@duesk.co.jp を役員承認者としても設定
INSERT INTO expense_approver_settings (id, approval_type, approver_id, is_active, priority, created_by)
VALUES (
    gen_random_uuid(),
    'executive',
    '3bb73c7d-4086-4304-a918-3d871c98ddc9', -- admin@duesk.co.jpのID
    true,
    1,
    '3bb73c7d-4086-4304-a918-3d871c98ddc9'
);

-- daichiro.uesaka@duesk.co.jp を管理部承認者として追加設定（優先順位2）
INSERT INTO expense_approver_settings (id, approval_type, approver_id, is_active, priority, created_by)
VALUES (
    gen_random_uuid(),
    'manager',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- daichiro.uesaka@duesk.co.jpのID
    true,
    2,
    '3bb73c7d-4086-4304-a918-3d871c98ddc9'
);