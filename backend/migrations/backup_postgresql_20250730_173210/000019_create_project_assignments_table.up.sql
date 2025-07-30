-- エンジニア案件アサインテーブルの作成
CREATE TABLE IF NOT EXISTS project_assignments (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  project_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '案件ID',
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ユーザーID',
  role VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '役割',
  start_date DATE NOT NULL COMMENT '参画開始日',
  end_date DATE COMMENT '参画終了日',
  utilization_rate INT DEFAULT 100 COMMENT '稼働率（%）',
  billing_rate DECIMAL(10, 2) COMMENT '請求単価（この案件での単価）',
  notes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '備考',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
  deleted_at DATETIME(3) NULL COMMENT '削除日時',
  CONSTRAINT fk_project_assignments_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_project_assignments_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_project_assignments_user_id (user_id),
  INDEX idx_project_assignments_project_id (project_id),
  INDEX idx_project_assignments_end_date (end_date),
  UNIQUE INDEX idx_project_assignments_active (project_id, user_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='エンジニア案件アサインテーブル';