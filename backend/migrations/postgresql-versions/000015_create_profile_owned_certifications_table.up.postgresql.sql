-- プロフィール所有資格テーブル（ユーザー入力専用）
CREATE TABLE IF NOT EXISTS profile_owned_certifications (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    certification_name VARCHAR(255) NOT NULL, -- ユーザーが入力した資格名
    certification_id VARCHAR(36) NULL, -- マスターとの紐付け（任意）
    acquired_date DATE NOT NULL, -- 取得日
    expiry_date DATE NULL, -- 有効期限
    issuer VARCHAR(255) NULL, -- 発行機関
    credential_number VARCHAR(100) NULL, -- 資格番号・認定番号
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (certification_id) REFERENCES certifications(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_profile_id ON profile_owned_certifications(profile_id);
CREATE INDEX idx_certification_name ON profile_owned_certifications(certification_name);

-- Table comment
COMMENT ON TABLE profile_owned_certifications IS 'プロフィール所有資格（ユーザー入力）';
-- 既存のprofile_certificationsのデータを移行
INSERT INTO profile_owned_certifications (
    id, 
    profile_id, 
    certification_name, 
    certification_id, 
    acquired_date, 
    expiry_date, 
    created_at, 
    updated_at
) 
SELECT 
    gen_random_uuid()::text as id,
    pc.profile_id, 
    c.name as certification_name, 
    pc.certification_id, 
    pc.acquired_date, 
    pc.expiry_date, 
    pc.created_at, 
    pc.updated_at 
FROM profile_certifications pc 
INNER JOIN certifications c ON pc.certification_id = c.id;

-- 古いテーブルは段階的に廃止（別途計画）
-- DROP TABLE profile_certifications;


-- Triggers for automatic timestamp updates

-- Trigger for profile_owned_certifications table
CREATE OR REPLACE TRIGGER update_profile_owned_certifications_updated_at
    BEFORE UPDATE ON profile_owned_certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
