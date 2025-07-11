-- Skills テーブル作成
CREATE TABLE IF NOT EXISTS skills (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL
);
-- Certifications テーブル作成
CREATE TABLE IF NOT EXISTS certifications (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  issuer VARCHAR(255),
  description TEXT,
  is_common BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 999,
  category VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL
);

-- PostgreSQL用のコメント設定
COMMENT ON COLUMN certifications.is_common IS 'よく使われる資格';
COMMENT ON COLUMN certifications.display_order IS '表示順';
COMMENT ON COLUMN certifications.category IS '資格カテゴリ（国家資格、ベンダー資格等）';

-- インデックスの作成
CREATE INDEX idx_common_certs ON certifications (is_common, display_order);
-- ProfileSkills 中間テーブル作成
CREATE TABLE IF NOT EXISTS profile_skills (
  profile_id VARCHAR(36) NOT NULL,
  skill_id VARCHAR(36) NOT NULL,
  level INT NOT NULL,
  years_of_experience INT,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  PRIMARY KEY (profile_id, skill_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);
-- ProfileCertifications 中間テーブル作成
CREATE TABLE IF NOT EXISTS profile_certifications (
  id VARCHAR(36) PRIMARY KEY,
  profile_id VARCHAR(36) NOT NULL,
  certification_id VARCHAR(36) NULL,
  custom_name VARCHAR(255) NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  acquired_date DATE NOT NULL,
  expiry_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (certification_id) REFERENCES certifications(id) ON DELETE CASCADE
);

-- PostgreSQL用のコメント設定
COMMENT ON COLUMN profile_certifications.certification_id IS 'NULLの場合はカスタム入力';
COMMENT ON COLUMN profile_certifications.custom_name IS 'マスタにない資格名';
COMMENT ON COLUMN profile_certifications.is_custom IS 'カスタム入力フラグ';

-- インデックスの作成
CREATE INDEX idx_profile_certs ON profile_certifications (profile_id);
CREATE INDEX idx_profile_cert_unique ON profile_certifications (profile_id, certification_id, custom_name);


-- Triggers for automatic timestamp updates

-- Trigger for skills table
CREATE OR REPLACE TRIGGER update_skills_updated_at
    BEFORE UPDATE ON skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for certifications table
CREATE OR REPLACE TRIGGER update_certifications_updated_at
    BEFORE UPDATE ON certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profile_skills table
CREATE OR REPLACE TRIGGER update_profile_skills_updated_at
    BEFORE UPDATE ON profile_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profile_certifications table
CREATE OR REPLACE TRIGGER update_profile_certifications_updated_at
    BEFORE UPDATE ON profile_certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
