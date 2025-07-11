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
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    INDEX idx_expense_receipts_expense_id (expense_id),
    INDEX idx_expense_receipts_display_order (expense_id, display_order),
    CONSTRAINT fk_expense_receipts_expense FOREIGN KEY (expense_id) 
        REFERENCES expenses(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 既存の単一領収書データを新テーブルに移行
INSERT INTO expense_receipts (id, expense_id, receipt_url, s3_key, file_name, file_size, content_type, display_order)
SELECT 
    UUID(),
    id,
    receipt_url,
    COALESCE(
        CASE 
            WHEN receipt_url LIKE '%amazonaws.com%' THEN 
                SUBSTRING_INDEX(SUBSTRING_INDEX(receipt_url, '.com/', -1), '?', 1)
            ELSE 
                CONCAT('receipts/', id, '/', SUBSTRING_INDEX(receipt_url, '/', -1))
        END,
        ''
    ),
    SUBSTRING_INDEX(
        CASE 
            WHEN receipt_url LIKE '%?%' THEN SUBSTRING_INDEX(receipt_url, '?', 1)
            ELSE receipt_url
        END, 
        '/', 
        -1
    ),
    0, -- デフォルトファイルサイズ
    'application/octet-stream', -- デフォルトContent-Type
    1 -- 最初の領収書として順序1を設定
FROM expenses
WHERE receipt_url IS NOT NULL AND receipt_url != '';

-- 既存のreceipt_urlカラムにコメントを追加（後方互換性のため削除はしない）
ALTER TABLE expenses 
    MODIFY COLUMN receipt_url VARCHAR(255) COMMENT '廃止予定：expense_receiptsテーブルを使用してください';