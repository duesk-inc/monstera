-- 複数領収書機能マイグレーションテストスクリプト
-- このスクリプトは開発環境でのテスト用です

-- 1. 現在の経費申請データを確認
SELECT 
    e.id,
    e.title,
    e.receipt_url,
    e.status,
    e.created_at
FROM expenses e
WHERE e.receipt_url IS NOT NULL AND e.receipt_url != ''
LIMIT 10;

-- 2. マイグレーション実行後の領収書データを確認
SELECT 
    er.id,
    er.expense_id,
    er.receipt_url,
    er.s3_key,
    er.file_name,
    er.display_order,
    er.created_at
FROM expense_receipts er
JOIN expenses e ON e.id = er.expense_id
ORDER BY er.expense_id, er.display_order
LIMIT 20;

-- 3. 各経費申請の領収書数を確認
SELECT 
    e.id,
    e.title,
    COUNT(er.id) as receipt_count
FROM expenses e
LEFT JOIN expense_receipts er ON e.id = er.expense_id
GROUP BY e.id
HAVING COUNT(er.id) > 0
ORDER BY receipt_count DESC
LIMIT 10;

-- 4. 既存のreceipt_urlと新しいexpense_receiptsテーブルのデータ整合性確認
SELECT 
    e.id,
    e.title,
    e.receipt_url as original_receipt_url,
    er.receipt_url as migrated_receipt_url,
    CASE 
        WHEN e.receipt_url = er.receipt_url THEN 'OK'
        ELSE 'NG'
    END as migration_status
FROM expenses e
LEFT JOIN expense_receipts er ON e.id = er.expense_id AND er.display_order = 1
WHERE e.receipt_url IS NOT NULL AND e.receipt_url != ''
LIMIT 20;