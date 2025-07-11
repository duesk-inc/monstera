-- インデックス削除
DROP INDEX IF EXISTS idx_users_sei_kana_mei_kana;
DROP INDEX IF EXISTS idx_users_sei_mei;
DROP INDEX IF EXISTS idx_users_engineer_status;
DROP INDEX IF EXISTS idx_users_employee_number;

-- カラム削除
ALTER TABLE users 
    DROP COLUMN IF EXISTS engineer_status,
    DROP COLUMN IF EXISTS phone_number,
    DROP COLUMN IF EXISTS education,
    DROP COLUMN IF EXISTS hire_date,
    DROP COLUMN IF EXISTS position,
    DROP COLUMN IF EXISTS department,
    DROP COLUMN IF EXISTS employee_number,
    DROP COLUMN IF EXISTS mei_kana,
    DROP COLUMN IF EXISTS sei_kana,
    DROP COLUMN IF EXISTS mei,
    DROP COLUMN IF EXISTS sei;

-- ENUM型の削除
DROP TYPE IF EXISTS engineer_status_enum;