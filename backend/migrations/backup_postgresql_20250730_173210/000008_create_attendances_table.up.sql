-- Attendances テーブル作成
CREATE TABLE IF NOT EXISTS attendances (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  date DATETIME NOT NULL,
  status ENUM('present', 'absent', 'late', 'early_leave', 'paid_leave', 'unpaid_leave', 'holiday') DEFAULT 'present' NOT NULL COMMENT 'ステータス（present:出勤, absent:欠勤, late:遅刻, early_leave:早退, paid_leave:有給休暇, unpaid_leave:無給休暇, holiday:祝日）',
  start_time DATETIME NULL,
  end_time DATETIME NULL,
  break_time INT DEFAULT 0,
  memo TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_attendances_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_attendances_status (status),
  INDEX idx_attendances_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci; 