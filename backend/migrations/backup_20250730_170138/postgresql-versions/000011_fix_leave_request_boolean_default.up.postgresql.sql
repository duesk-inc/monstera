-- is_hourly_based フィールドにデフォルト値を設定（PostgreSQL版）
ALTER TABLE leave_requests 
ALTER COLUMN is_hourly_based SET DEFAULT FALSE;