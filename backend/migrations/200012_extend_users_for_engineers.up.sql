-- usersテーブルにエンジニア管理用のカラムを追加
ALTER TABLE users ADD COLUMN sei VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '姓' AFTER updated_at;
ALTER TABLE users ADD COLUMN mei VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '名' AFTER sei;
ALTER TABLE users ADD COLUMN sei_kana VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'セイ' AFTER mei;
ALTER TABLE users ADD COLUMN mei_kana VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'メイ' AFTER sei_kana;
ALTER TABLE users ADD COLUMN employee_number VARCHAR(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci UNIQUE COMMENT '社員番号' AFTER mei_kana;
ALTER TABLE users ADD COLUMN department VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '所属部署' AFTER employee_number;
ALTER TABLE users ADD COLUMN position VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '役職' AFTER department;
ALTER TABLE users ADD COLUMN hire_date DATE COMMENT '入社日' AFTER position;
ALTER TABLE users ADD COLUMN education VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '最終学歴' AFTER hire_date;
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '電話番号' AFTER education;
ALTER TABLE users ADD COLUMN engineer_status ENUM('active', 'standby', 'resigned', 'long_leave') DEFAULT 'active' COMMENT 'エンジニアステータス' AFTER phone_number;

-- インデックス追加
CREATE INDEX idx_users_employee_number ON users(employee_number);
CREATE INDEX idx_users_engineer_status ON users(engineer_status);
CREATE INDEX idx_users_sei_mei ON users(sei, mei);
CREATE INDEX idx_users_sei_kana_mei_kana ON users(sei_kana, mei_kana);

-- 既存ユーザーのnameカラムから姓名を分割して設定（オプション）
-- 注: 実環境では手動でのデータ移行が推奨されます
UPDATE users 
SET sei = SUBSTRING_INDEX(name, ' ', 1),
    mei = SUBSTRING_INDEX(name, ' ', -1)
WHERE name IS NOT NULL AND name != '' AND sei IS NULL;