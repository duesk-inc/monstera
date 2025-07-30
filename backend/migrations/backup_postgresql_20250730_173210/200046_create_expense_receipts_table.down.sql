-- expense_receiptsテーブルを削除
DROP TABLE IF EXISTS expense_receipts;

-- receipt_urlカラムのコメントを削除
ALTER TABLE expenses 
    MODIFY COLUMN receipt_url VARCHAR(255);