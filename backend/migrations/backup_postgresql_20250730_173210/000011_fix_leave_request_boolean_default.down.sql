-- デフォルト値を削除
ALTER TABLE leave_requests 
MODIFY COLUMN is_hourly_based BOOLEAN NOT NULL;