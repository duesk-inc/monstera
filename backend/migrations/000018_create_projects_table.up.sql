-- 案件管理テーブルの作成
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  client_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '取引先ID',
  project_name VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '案件名',
  project_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '案件コード',
  status ENUM('proposal', 'negotiation', 'active', 'closed', 'lost') DEFAULT 'proposal' COMMENT '案件ステータス',
  start_date DATE COMMENT '開始日',
  end_date DATE COMMENT '終了予定日',
  monthly_rate DECIMAL(10, 2) COMMENT '月額単価',
  working_hours_min INT DEFAULT 140 COMMENT '最低稼働時間',
  working_hours_max INT DEFAULT 180 COMMENT '最高稼働時間',
  contract_type ENUM('ses', 'contract', 'dispatch') DEFAULT 'ses' COMMENT '契約形態',
  work_location VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '勤務地',
  description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '案件詳細',
  requirements TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '必要スキル・要件',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
  deleted_at DATETIME(3) NULL COMMENT '削除日時',
  CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES clients(id),
  INDEX idx_projects_status (status),
  INDEX idx_projects_end_date (end_date),
  INDEX idx_projects_project_code (project_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='案件管理テーブル';