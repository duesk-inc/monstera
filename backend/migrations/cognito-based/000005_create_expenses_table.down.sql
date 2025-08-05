-- 経費申請関連テーブルの削除

-- トリガーの削除
DROP TRIGGER IF EXISTS update_expense_summaries_updated_at ON expense_summaries;
DROP TRIGGER IF EXISTS update_expense_limits_updated_at ON expense_limits;
DROP TRIGGER IF EXISTS update_expense_drafts_updated_at ON expense_drafts;
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;

-- インデックスの削除
-- expense_summaries
DROP INDEX IF EXISTS idx_expense_summaries_category;
DROP INDEX IF EXISTS idx_expense_summaries_user_period;

-- expense_limits
DROP INDEX IF EXISTS idx_expense_limits_scope;
DROP INDEX IF EXISTS idx_expense_limits_category;

-- expense_approvals
DROP INDEX IF EXISTS idx_expense_approvals_created_at;
DROP INDEX IF EXISTS idx_expense_approvals_approver_id;
DROP INDEX IF EXISTS idx_expense_approvals_expense_id;

-- expense_drafts
DROP INDEX IF EXISTS idx_expense_drafts_updated_at;
DROP INDEX IF EXISTS idx_expense_drafts_user_id;

-- expenses
DROP INDEX IF EXISTS idx_expenses_deleted_at;
DROP INDEX IF EXISTS idx_expenses_deadline;
DROP INDEX IF EXISTS idx_expenses_category;
DROP INDEX IF EXISTS idx_expenses_approver_id;
DROP INDEX IF EXISTS idx_expenses_status;
DROP INDEX IF EXISTS idx_expenses_expense_date;
DROP INDEX IF EXISTS idx_expenses_user_id;

-- テーブルの削除（依存関係の順序で削除）
DROP TABLE IF EXISTS expense_summaries CASCADE;
DROP TABLE IF EXISTS expense_limits CASCADE;
DROP TABLE IF EXISTS expense_approvals CASCADE;
DROP TABLE IF EXISTS expense_drafts CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;