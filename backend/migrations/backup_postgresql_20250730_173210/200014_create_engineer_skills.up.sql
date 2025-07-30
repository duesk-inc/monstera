-- エンジニアスキルカテゴリテーブル作成
CREATE TABLE IF NOT EXISTS engineer_skill_categories (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'カテゴリ名',
  parent_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '親カテゴリID',
  sort_order INT DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_skill_category_parent FOREIGN KEY (parent_id) REFERENCES engineer_skill_categories(id),
  INDEX idx_skill_category_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='エンジニアスキルカテゴリ';

-- 初期データ投入
INSERT INTO engineer_skill_categories (id, name, parent_id, sort_order) VALUES
('01234567-89ab-cdef-0123-456789abcde1', 'フロントエンド', NULL, 1),
('01234567-89ab-cdef-0123-456789abcde2', 'バックエンド', NULL, 2),
('01234567-89ab-cdef-0123-456789abcde3', 'インフラ', NULL, 3),
('01234567-89ab-cdef-0123-456789abcde4', 'データベース', NULL, 4),
('01234567-89ab-cdef-0123-456789abcde5', 'モバイル', NULL, 5),
('01234567-89ab-cdef-0123-456789abcde6', 'DevOps', NULL, 6),
('01234567-89ab-cdef-0123-456789abcde7', 'その他', NULL, 7);

-- エンジニアスキルテーブル作成
CREATE TABLE IF NOT EXISTS engineer_skills (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  skill_category_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  skill_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'スキル名',
  skill_level INT CHECK (skill_level BETWEEN 1 AND 5) COMMENT 'スキルレベル(1-5)',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_engineer_skill_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_engineer_skill_category FOREIGN KEY (skill_category_id) REFERENCES engineer_skill_categories(id),
  UNIQUE KEY uk_user_skill (user_id, skill_name),
  INDEX idx_engineer_skill_user (user_id),
  INDEX idx_engineer_skill_category (skill_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='エンジニアスキル';