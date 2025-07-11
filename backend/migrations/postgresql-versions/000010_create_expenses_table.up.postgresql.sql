CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount INT NOT NULL,
  expense_date TIMESTAMP(3) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  description TEXT,
  receipt_url VARCHAR(255),
  approver_id VARCHAR(36) NULL,
  approved_at TIMESTAMP(3) NULL,
  paid_at TIMESTAMP(3) NULL,
  created_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  updated_at TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo'),
  deleted_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_expenses_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- PostgreSQL用のコメント設定
COMMENT ON COLUMN expenses.status IS 'ステータス（draft:下書き, submitted:提出済み, approved:承認済み, rejected:却下, paid:支払済み）';

-- Triggers for automatic timestamp updates
-- Trigger for expenses table
CREATE OR REPLACE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();