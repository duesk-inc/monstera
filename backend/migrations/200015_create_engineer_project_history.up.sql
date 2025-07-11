-- エンジニアプロジェクト履歴テーブル作成
CREATE TABLE IF NOT EXISTS engineer_project_history (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  project_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  role ENUM('manager', 'leader', 'member') NOT NULL COMMENT '役割',
  start_date DATE NOT NULL COMMENT '参画開始日',
  end_date DATE COMMENT '参画終了日',
  is_current BOOLEAN DEFAULT FALSE COMMENT '現在参画中フラグ',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_project_history_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_project_history_project FOREIGN KEY (project_id) REFERENCES projects(id),
  INDEX idx_project_history_user (user_id),
  INDEX idx_project_history_project (project_id),
  INDEX idx_project_history_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='エンジニアプロジェクト履歴';