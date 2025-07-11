-- 経費申請関連テーブルの削除 -- インデックスの削除 DROP INDEX IF EXISTS idx_expenses_user_status ON expenses;
DROP INDEX IF EXISTS idx_expenses_expense_date ON expenses;
DROP INDEX IF EXISTS idx_expenses_amount ON expenses;
DROP INDEX IF EXISTS idx_expenses_category ON expenses;
-- テーブルの削除（依存関係の順序に注意） DROP TABLE IF EXISTS expense_summaries;
DROP TABLE IF EXISTS expense_limits;
DROP TABLE IF EXISTS expense_categories;
DROP TABLE IF EXISTS expense_approvals;
