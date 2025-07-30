-- インデックス削除
DROP INDEX idx_users_sei_kana_mei_kana ON users;
DROP INDEX idx_users_sei_mei ON users;
DROP INDEX idx_users_engineer_status ON users;
DROP INDEX idx_users_employee_number ON users;

-- カラム削除
ALTER TABLE users DROP COLUMN engineer_status;
ALTER TABLE users DROP COLUMN phone_number;
ALTER TABLE users DROP COLUMN education;
ALTER TABLE users DROP COLUMN hire_date;
ALTER TABLE users DROP COLUMN position;
ALTER TABLE users DROP COLUMN department;
ALTER TABLE users DROP COLUMN employee_number;
ALTER TABLE users DROP COLUMN mei_kana;
ALTER TABLE users DROP COLUMN sei_kana;
ALTER TABLE users DROP COLUMN mei;
ALTER TABLE users DROP COLUMN sei;