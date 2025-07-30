-- プロフィール所有資格テーブル（ユーザー入力専用）
CREATE TABLE IF NOT EXISTS profile_owned_certifications (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  profile_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  certification_name VARCHAR(255) NOT NULL COMMENT 'ユーザーが入力した資格名',
  certification_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT 'マスターとの紐付け（任意）',
  acquired_date DATE NOT NULL COMMENT '取得日',
  expiry_date DATE NULL COMMENT '有効期限',
  issuer VARCHAR(255) NULL COMMENT '発行機関',
  credential_number VARCHAR(100) NULL COMMENT '資格番号・認定番号',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (certification_id) REFERENCES certifications(id) ON DELETE SET NULL,
  INDEX idx_profile_id (profile_id),
  INDEX idx_certification_name (certification_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='プロフィール所有資格（ユーザー入力）';

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
  UUID() as id,
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