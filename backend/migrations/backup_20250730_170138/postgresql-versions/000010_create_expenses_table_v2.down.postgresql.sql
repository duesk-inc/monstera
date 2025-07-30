-- expensesテーブル削除
DROP TRIGGER IF EXISTS update_expense_deadline_settings_updated_at ON expense_deadline_settings;
DROP TABLE IF EXISTS expense_deadline_settings;
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
DROP TABLE IF EXISTS expenses;