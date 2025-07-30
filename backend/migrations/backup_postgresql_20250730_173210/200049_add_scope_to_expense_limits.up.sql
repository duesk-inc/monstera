-- 経費申請上限テーブルにスコープ機能を追加

-- 1. 新しい制限適用範囲列を追加
ALTER TABLE expense_limits 
ADD COLUMN limit_scope ENUM('company', 'department', 'user') NOT NULL DEFAULT 'company' AFTER limit_type;

-- 2. ユーザーID列を追加（個人制限の場合）
ALTER TABLE expense_limits 
ADD COLUMN user_id VARCHAR(36) NULL AFTER amount,
ADD INDEX idx_expense_limits_user_id (user_id);

-- 3. 部門ID列を追加（部門制限の場合）
ALTER TABLE expense_limits 
ADD COLUMN department_id VARCHAR(36) NULL AFTER user_id,
ADD INDEX idx_expense_limits_department_id (department_id);

-- 4. 複合インデックスを追加（効率的な制限検索のため）
ALTER TABLE expense_limits 
ADD INDEX idx_expense_limits_scope_type_effective (limit_scope, limit_type, effective_from);

-- 5. 個人制限用の複合インデックス
ALTER TABLE expense_limits 
ADD INDEX idx_expense_limits_user_type_effective (user_id, limit_type, effective_from);

-- 6. 部門制限用の複合インデックス
ALTER TABLE expense_limits 
ADD INDEX idx_expense_limits_dept_type_effective (department_id, limit_type, effective_from);

-- 7. 既存のデータを全社レベルに設定
UPDATE expense_limits SET limit_scope = 'company' WHERE limit_scope IS NULL;

-- 8. 外部キー制約を追加（参照整合性のため）
-- ユーザーID外部キー
ALTER TABLE expense_limits 
ADD CONSTRAINT fk_expense_limits_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 注意: 部門テーブルが存在する場合のみ外部キーを追加
-- 現在はusersテーブルのdepartment_idを参照しているため、部門マスタテーブルが必要
-- ALTER TABLE expense_limits 
-- ADD CONSTRAINT fk_expense_limits_department_id 
-- FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;