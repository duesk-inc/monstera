-- L�3��-�n����Jd

DO $$
DECLARE
    -- ������g(W_ID
    manager_approver1_id VARCHAR(36) := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01';
    executive_approver1_id VARCHAR(36) := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02';
BEGIN
    -- �-��Jd
    DELETE FROM expense_approver_settings 
    WHERE id IN (manager_approver1_id, executive_approver1_id);
    
    -- -�eto��(jngJdWjD
    
    RAISE NOTICE 'L�3��-�n����JdW~W_';
END$$;