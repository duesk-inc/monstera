-- 経費申請関連テーブルの追加

-- ENUM型の作成
DO $$
BEGIN
    -- approval_type用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_type_enum') THEN
        CREATE TYPE approval_type_enum AS ENUM ('manager', 'executive');
    END IF;
    -- status用ENUM（まだ存在しない場合のみ）
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_enum') THEN
        CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    -- limit_type用ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_limit_type_enum') THEN
        CREATE TYPE expense_limit_type_enum AS ENUM ('monthly', 'yearly');
    END IF;
END$$;

-- 1. 承認履歴テーブル
CREATE TABLE IF NOT EXISTS expense_approvals (
    id VARCHAR(36) PRIMARY KEY,
    expense_id VARCHAR(36) NOT NULL,
    approver_id VARCHAR(36) NOT NULL,
    approval_type approval_type_enum NOT NULL,
    approval_order INT NOT NULL DEFAULT 1,
    status approval_status_enum DEFAULT 'pending' NOT NULL,
    comment TEXT,
    approved_at TIMESTAMP(3),
    created_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    CONSTRAINT uk_expense_approval UNIQUE (expense_id, approval_type, approval_order),
    CONSTRAINT fk_expense_approvals_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_expense_approvals_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_expense_approvals_expense_id ON expense_approvals(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_approver_status ON expense_approvals(approver_id, status);

-- 2. カテゴリマスタテーブル
CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    requires_details BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INT NOT NULL,
    created_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    deleted_at TIMESTAMP(3)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active, display_order);

-- 3. 申請上限テーブル
CREATE TABLE IF NOT EXISTS expense_limits (
    id VARCHAR(36) PRIMARY KEY,
    limit_type expense_limit_type_enum NOT NULL,
    limit_scope VARCHAR(20) NOT NULL DEFAULT 'company' CHECK (limit_scope IN ('company', 'department', 'user')),
    amount INT NOT NULL,
    user_id VARCHAR(36) NULL,
    department_id VARCHAR(36) NULL,
    effective_from TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    CONSTRAINT fk_expense_limits_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_expense_limits_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_expense_limits_type_date ON expense_limits(limit_type, effective_from);
CREATE INDEX IF NOT EXISTS idx_expense_limits_user_id ON expense_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_limits_department_id ON expense_limits(department_id);
CREATE INDEX IF NOT EXISTS idx_expense_limits_scope_type_effective ON expense_limits(limit_scope, limit_type, effective_from);
CREATE INDEX IF NOT EXISTS idx_expense_limits_user_type_effective ON expense_limits(user_id, limit_type, effective_from);
CREATE INDEX IF NOT EXISTS idx_expense_limits_dept_type_effective ON expense_limits(department_id, limit_type, effective_from);

-- 4. 集計テーブル
CREATE TABLE IF NOT EXISTS expense_summaries (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    total_amount INT NOT NULL DEFAULT 0,
    approved_amount INT NOT NULL DEFAULT 0,
    pending_amount INT NOT NULL DEFAULT 0,
    expense_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    CONSTRAINT uk_user_period UNIQUE (user_id, year, month),
    CONSTRAINT fk_expense_summaries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_expense_summaries_user ON expense_summaries(user_id);

-- 5. 既存のexpensesテーブルにインデックスを追加
CREATE INDEX IF NOT EXISTS idx_expenses_user_status ON expenses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_amount ON expenses(amount);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- 6. カテゴリマスタの初期データ投入
INSERT INTO expense_categories (id, code, name, requires_details, is_active, display_order) VALUES 
    (gen_random_uuid()::text, 'transport', '旅費交通費', false, true, 1),
    (gen_random_uuid()::text, 'entertainment', '交際費', false, true, 2),
    (gen_random_uuid()::text, 'supplies', '備品', false, true, 3),
    (gen_random_uuid()::text, 'books', '書籍', false, true, 4),
    (gen_random_uuid()::text, 'seminar', 'セミナー', false, true, 5),
    (gen_random_uuid()::text, 'other', 'その他', true, true, 6)
ON CONFLICT (code) DO NOTHING;

-- 7. 申請上限の初期データ投入（デフォルト値）
-- 初期値はseed実行時に管理者のIDで投入される想定のため、ここではコメントアウト
-- INSERT INTO expense_limits (id, limit_type, amount, created_by) VALUES
-- (gen_random_uuid()::text, 'monthly', 500000, (SELECT id FROM users WHERE email = 'admin@duesk.co.jp' LIMIT 1)),
-- (gen_random_uuid()::text, 'yearly', 2000000, (SELECT id FROM users WHERE email = 'admin@duesk.co.jp' LIMIT 1));


-- Triggers for automatic timestamp updates

-- Trigger for expense_approvals table
DROP TRIGGER IF EXISTS update_expense_approvals_updated_at ON expense_approvals;
CREATE TRIGGER update_expense_approvals_updated_at
    BEFORE UPDATE ON expense_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for expense_categories table
DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
    BEFORE UPDATE ON expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for expense_limits table
DROP TRIGGER IF EXISTS update_expense_limits_updated_at ON expense_limits;
CREATE TRIGGER update_expense_limits_updated_at
    BEFORE UPDATE ON expense_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for expense_summaries table
DROP TRIGGER IF EXISTS update_expense_summaries_updated_at ON expense_summaries;
CREATE TRIGGER update_expense_summaries_updated_at
    BEFORE UPDATE ON expense_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. expensesテーブルにcategory_idの外部キー制約を追加
ALTER TABLE expenses 
    ADD CONSTRAINT fk_expenses_category 
    FOREIGN KEY (category_id) 
    REFERENCES expense_categories(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;