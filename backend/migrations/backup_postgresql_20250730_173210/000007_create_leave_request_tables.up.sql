-- 休暇申請テーブル作成
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  leave_type_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  request_date DATE NOT NULL,
  is_hourly_based BOOLEAN NOT NULL,
  reason TEXT,
  total_days DECIMAL(5,1) NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending' NOT NULL COMMENT 'ステータス（pending:申請中, approved:承認済み, rejected:却下, cancelled:取消）',
  approver_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  processed_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT leave_requests_ibfk_1 FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  CONSTRAINT leave_requests_ibfk_2 FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_leave_requests_approver FOREIGN KEY (approver_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 休暇申請詳細テーブル作成
CREATE TABLE IF NOT EXISTS leave_request_details (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  leave_request_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  leave_date DATE NOT NULL,
  start_time VARCHAR(10),
  end_time VARCHAR(10),
  day_value DECIMAL(3,1) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT leave_request_details_ibfk_1 FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE,
  UNIQUE KEY (leave_request_id, leave_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci; 