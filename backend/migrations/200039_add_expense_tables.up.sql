-- 経費申請関連テーブルの追加

-- 1. 承認履歴テーブル
CREATE TABLE IF NOT EXISTS expense_approvals (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    expense_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    approver_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    approval_type ENUM('manager', 'executive') NOT NULL,
    approval_order INT NOT NULL DEFAULT 1,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' NOT NULL,
    comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
    approved_at DATETIME(3),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_expense_approvals_expense_id (expense_id),
    INDEX idx_expense_approvals_approver_status (approver_id, status),
    UNIQUE KEY uk_expense_approval (expense_id, approval_type, approval_order),
    
    CONSTRAINT fk_expense_approvals_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_expense_approvals_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. カテゴリマスタテーブル
CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL UNIQUE,
    name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    requires_details BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INT NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3),
    
    INDEX idx_expense_categories_active (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. 申請上限テーブル
CREATE TABLE IF NOT EXISTS expense_limits (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    limit_type ENUM('monthly', 'yearly') NOT NULL,
    amount INT NOT NULL,
    effective_from DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_expense_limits_type_date (limit_type, effective_from),
    
    CONSTRAINT fk_expense_limits_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. 集計テーブル
CREATE TABLE IF NOT EXISTS expense_summaries (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    total_amount INT NOT NULL DEFAULT 0,
    approved_amount INT NOT NULL DEFAULT 0,
    pending_amount INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    UNIQUE KEY uk_user_period (user_id, year, month),
    INDEX idx_expense_summaries_user (user_id),
    
    CONSTRAINT fk_expense_summaries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. 既存のexpensesテーブルにインデックスを追加
CREATE INDEX IF NOT EXISTS idx_expenses_user_status ON expenses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_amount ON expenses(amount);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- 6. カテゴリマスタの初期データ投入
INSERT INTO expense_categories (id, code, name, requires_details, is_active, display_order) VALUES
(UUID(), 'transport', '旅費交通費', false, true, 1),
(UUID(), 'entertainment', '交際費', false, true, 2),
(UUID(), 'supplies', '備品', false, true, 3),
(UUID(), 'books', '書籍', false, true, 4),
(UUID(), 'seminar', 'セミナー', false, true, 5),
(UUID(), 'other', 'その他', true, true, 6);

-- 7. 申請上限の初期データ投入（デフォルト値）
-- 初期値はseed実行時に管理者のIDで投入される想定のため、ここではコメントアウト
-- INSERT INTO expense_limits (id, limit_type, amount, created_by) VALUES
-- (UUID(), 'monthly', 500000, (SELECT id FROM users WHERE email = 'admin@duesk.co.jp' LIMIT 1)),
-- (UUID(), 'yearly', 2000000, (SELECT id FROM users WHERE email = 'admin@duesk.co.jp' LIMIT 1));