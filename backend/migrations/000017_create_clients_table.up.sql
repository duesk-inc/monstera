-- 取引先管理テーブルの作成
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  company_name VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '会社名',
  company_name_kana VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '会社名カナ',
  billing_type ENUM('monthly', 'hourly', 'fixed') DEFAULT 'monthly' COMMENT '請求タイプ',
  payment_terms INT DEFAULT 30 COMMENT '支払条件（日数）',
  contact_person VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '担当者名',
  contact_email VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '担当者メール',
  contact_phone VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '担当者電話番号',
  address VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '住所',
  notes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '備考',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
  deleted_at DATETIME(3) NULL COMMENT '削除日時',
  INDEX idx_clients_company_name (company_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='取引先管理テーブル';