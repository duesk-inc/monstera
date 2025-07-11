-- エンジニアステータス履歴テーブル作成
CREATE TABLE IF NOT EXISTS engineer_status_history (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  previous_status ENUM('active', 'standby', 'resigned', 'long_leave'),
  new_status ENUM('active', 'standby', 'resigned', 'long_leave') NOT NULL,
  change_reason TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '変更理由',
  changed_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '変更実行者',
  changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_status_history_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_status_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_status_history_user_id (user_id),
  INDEX idx_status_history_changed_at (changed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='エンジニアステータス履歴';