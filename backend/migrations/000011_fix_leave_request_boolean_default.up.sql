-- is_hourly_based フィールドにデフォルト値を設定
ALTER TABLE leave_requests 
MODIFY COLUMN is_hourly_based BOOLEAN NOT NULL DEFAULT FALSE;