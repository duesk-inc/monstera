-- Seed expense approver settings

DO $$
DECLARE
    admin_user_id VARCHAR(255);
    daichiro_user_id VARCHAR(255);
BEGIN
    -- Get admin@duesk.co.jp user ID
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@duesk.co.jp' LIMIT 1;
    
    -- Get daichiro.uesaka@duesk.co.jp user ID
    SELECT id INTO daichiro_user_id FROM users WHERE email = 'daichiro.uesaka@duesk.co.jp' LIMIT 1;
    
    -- Add admin@duesk.co.jp as manager approver
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO expense_approver_settings (
            id, 
            approval_type, 
            approver_id, 
            is_active, 
            priority, 
            created_by,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid()::text,
            'manager'::approval_type_enum,
            admin_user_id,
            true,
            1,
            admin_user_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) ON CONFLICT (approval_type, approver_id) DO UPDATE
        SET 
            is_active = EXCLUDED.is_active,
            priority = EXCLUDED.priority,
            updated_at = CURRENT_TIMESTAMP;

        -- Add admin@duesk.co.jp as executive approver
        INSERT INTO expense_approver_settings (
            id, 
            approval_type, 
            approver_id, 
            is_active, 
            priority, 
            created_by,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid()::text,
            'executive'::approval_type_enum,
            admin_user_id,
            true,
            1,
            admin_user_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) ON CONFLICT (approval_type, approver_id) DO UPDATE
        SET 
            is_active = EXCLUDED.is_active,
            priority = EXCLUDED.priority,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Add daichiro.uesaka@duesk.co.jp as manager approver
    IF daichiro_user_id IS NOT NULL THEN
        INSERT INTO expense_approver_settings (
            id, 
            approval_type, 
            approver_id, 
            is_active, 
            priority, 
            created_by,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid()::text,
            'manager'::approval_type_enum,
            daichiro_user_id,
            true,
            2,
            daichiro_user_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) ON CONFLICT (approval_type, approver_id) DO UPDATE
        SET 
            is_active = EXCLUDED.is_active,
            priority = EXCLUDED.priority,
            updated_at = CURRENT_TIMESTAMP;

        -- Add daichiro.uesaka@duesk.co.jp as executive approver
        INSERT INTO expense_approver_settings (
            id, 
            approval_type, 
            approver_id, 
            is_active, 
            priority, 
            created_by,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid()::text,
            'executive'::approval_type_enum,
            daichiro_user_id,
            true,
            2,
            daichiro_user_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) ON CONFLICT (approval_type, approver_id) DO UPDATE
        SET 
            is_active = EXCLUDED.is_active,
            priority = EXCLUDED.priority,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RAISE NOTICE 'Expense approver settings have been initialized';
END$$;