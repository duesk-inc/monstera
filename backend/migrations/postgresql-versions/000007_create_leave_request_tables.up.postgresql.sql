-- 休暇申請テーブル作成
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  leave_type_id VARCHAR(36) NOT NULL,
  request_date DATE NOT NULL,
  is_hourly_based BOOLEAN NOT NULL,
  reason TEXT,
  total_days DECIMAL(5,1) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id VARCHAR(36),
  processed_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT leave_requests_ibfk_1 FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  CONSTRAINT leave_requests_ibfk_2 FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_leave_requests_approver FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- PostgreSQL用のコメント設定
COMMENT ON COLUMN leave_requests.status IS 'ステータス（pending:申請中, approved:承認済み, rejected:却下, cancelled:取消）';

-- 休暇申請詳細テーブル作成
CREATE TABLE IF NOT EXISTS leave_request_details (
  id VARCHAR(36) PRIMARY KEY,
  leave_request_id VARCHAR(36) NOT NULL,
  leave_date DATE NOT NULL,
  start_time VARCHAR(10),
  end_time VARCHAR(10),
  day_value DECIMAL(3,1) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT leave_request_details_ibfk_1 FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE,
  UNIQUE (leave_request_id, leave_date)
);

-- Triggers for automatic timestamp updates
-- Trigger for leave_requests table
CREATE OR REPLACE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for leave_request_details table
CREATE OR REPLACE TRIGGER update_leave_request_details_updated_at
    BEFORE UPDATE ON leave_request_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();