-- work_historiesテーブルの拡張を元に戻す

-- インデックスを削除
DROP INDEX IF EXISTS idx_work_histories_user_start ON work_histories;
DROP INDEX IF EXISTS idx_work_histories_start_duration ON work_histories;
DROP INDEX IF EXISTS idx_work_histories_duration_months ON work_histories;
DROP INDEX IF EXISTS idx_work_histories_start_date ON work_histories;

-- カラムを削除
ALTER TABLE work_histories DROP COLUMN IF EXISTS duration_months;