-- L»3Ë-šnÇü¿’Jd

DO $$
DECLARE
    -- ·üÉÇü¿g(W_ID
    manager_approver1_id VARCHAR(36) := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01';
    executive_approver1_id VARCHAR(36) := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02';
BEGIN
    -- -š’Jd
    DELETE FROM expense_approver_settings 
    WHERE id IN (manager_approver1_id, executive_approver1_id);
    
    -- -šetoãû(jngJdWjD
    
    RAISE NOTICE 'L»3Ë-šnÇü¿’JdW~W_';
END$$;