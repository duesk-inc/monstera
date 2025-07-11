-- 複数領収書対応のための経費領収書テーブル作成
CREATE TABLE IF NOT EXISTS expense_receipts (
    id VARCHAR(36) NOT NULL,
    expense_id VARCHAR(36) NOT NULL,
    receipt_url VARCHAR(255) NOT NULL,
    s3_key VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL DEFAULT 0,
    content_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3) AT TIME ZONE 'Asia/Tokyo'),
    PRIMARY KEY (id),
    CONSTRAINT fk_expense_receipts_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense_id ON expense_receipts(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_display_order ON expense_receipts(expense_id, display_order);

-- 既存の単一領収書データを新テーブルに移行
INSERT INTO expense_receipts (id, expense_id, receipt_url, s3_key, file_name, file_size, content_type, display_order)
SELECT 
    gen_random_uuid()::text,
    id,
    receipt_url,
    COALESCE(
        CASE 
            WHEN receipt_url LIKE '%amazonaws.com%' THEN 
                split_part(split_part(receipt_url, '.com/', 2), '?', 1)
            ELSE 
                CONCAT('receipts/', id, '/', split_part(receipt_url, '/', -1))
        END,
        ''
    ),
    split_part(
        CASE 
            WHEN receipt_url LIKE '%?%' THEN split_part(receipt_url, '?', 1)
            ELSE receipt_url
        END,
        '/', 
        -1
    ),
    0, -- デフォルトファイルサイズ
    'application/octet-stream', -- デフォルトContent-Type
    1  -- 最初の領収書として順序1を設定
FROM expenses
WHERE receipt_url IS NOT NULL 
  AND receipt_url != '';

-- 既存のreceipt_urlカラムにコメントを追加（後方互換性のため削除はしない）
COMMENT ON COLUMN expenses.receipt_url IS '廃止予定：expense_receiptsテーブルを使用してください';


-- Triggers for automatic timestamp updates

-- Trigger for expense_receipts table
DROP TRIGGER IF EXISTS update_expense_receipts_updated_at ON expense_receipts;
CREATE TRIGGER update_expense_receipts_updated_at
    BEFORE UPDATE ON expense_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();