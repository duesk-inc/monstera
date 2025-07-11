-- デフォルト値を削除（PostgreSQL版）
ALTER TABLE leave_requests 
ALTER COLUMN is_hourly_based DROP DEFAULT;