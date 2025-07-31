-- expense_countカラムを削除
ALTER TABLE expense_summaries
DROP COLUMN IF EXISTS expense_count;