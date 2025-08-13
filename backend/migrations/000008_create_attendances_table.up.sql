-- Attendances テーブル作成
CREATE TABLE IF NOT EXISTS attendances (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'present' NOT NULL CHECK (status IN ('present', 'absent', 'late', 'early_leave', 'paid_leave', 'unpaid_leave', 'holiday')),
  start_time TIMESTAMP NULL,
  end_time TIMESTAMP NULL,
  break_time INT DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_attendances_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- PostgreSQL用のコメント設定
COMMENT ON COLUMN attendances.status IS 'ステータス（present:出勤, absent:欠勤, late:遅刻, early_leave:早退, paid_leave:有給休暇, unpaid_leave:無給休暇, holiday:祝日）';

-- インデックスの作成
CREATE INDEX idx_attendances_status ON attendances (status);
CREATE INDEX idx_attendances_user_date ON attendances (user_id, date);

-- Triggers for automatic timestamp updates
-- Trigger for attendances table
CREATE OR REPLACE TRIGGER update_attendances_updated_at
    BEFORE UPDATE ON attendances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();