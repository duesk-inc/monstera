-- expense_summariesテーブルにexpense_countカラムを追加
ALTER TABLE expense_summaries 
ADD COLUMN expense_count INTEGER NOT NULL DEFAULT 0;

-- カラムにコメントを追加（PostgreSQLではCOMMENT ONを使用）
COMMENT ON COLUMN expense_summaries.expense_count IS '申請件数';

-- 既存データの件数を更新
UPDATE expense_summaries es
SET expense_count = (
    SELECT COUNT(*)
    FROM expenses e
    WHERE e.user_id = es.user_id
    AND EXTRACT(YEAR FROM e.expense_date) = es.year
    AND EXTRACT(MONTH FROM e.expense_date) = es.month
    AND e.status != 'draft'
);