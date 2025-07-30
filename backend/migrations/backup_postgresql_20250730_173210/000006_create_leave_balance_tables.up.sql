-- ユーザー別休暇付与テーブル作成
CREATE TABLE IF NOT EXISTS user_leave_balances (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  leave_type_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  fiscal_year INT NOT NULL,
  total_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  used_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  remaining_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  expire_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_leave_balances_user_id (user_id),
  INDEX idx_user_leave_balances_leave_type_id (leave_type_id),
  CONSTRAINT user_leave_balances_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT user_leave_balances_ibfk_2 FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 振替特別休暇の付与履歴管理テーブルの作成
CREATE TABLE IF NOT EXISTS substitute_leave_grants (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  grant_date DATE NOT NULL,
  granted_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  used_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  remaining_days DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  work_date DATE NOT NULL COMMENT '出勤した休日の日付',
  reason VARCHAR(255) NOT NULL COMMENT '付与理由（例：GW出勤、年末年始出勤）',
  expire_date DATE NOT NULL COMMENT '有効期限',
  is_expired BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_substitute_leave_grants_user_id (user_id),
  INDEX idx_substitute_leave_grants_expire_date (expire_date),
  CONSTRAINT substitute_leave_grants_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci; 