-- expense_summariesテーブルにexpense_countカラムを追加
ALTER TABLE expense_summaries
ADD COLUMN expense_count INTEGER NOT NULL DEFAULT 0;

-- 既存データのexpense_countを更新（実際の経費件数を反映）
UPDATE expense_summaries es
SET expense_count = (
    SELECT COUNT(*)
    FROM expenses e
    WHERE e.user_id = es.user_id
    AND EXTRACT(YEAR FROM e.expense_date) = es.year
    AND EXTRACT(MONTH FROM e.expense_date) = es.month
    AND e.status IN ('submitted', 'approved')
);