# 経費申請承認者設定のテストパターン

## データベースレベルのテスト

### 1. 承認者設定の確認
```sql
-- 承認者設定テーブルの確認
SELECT * FROM expense_approver_settings;

-- アクティブな承認者の確認
SELECT eas.*, u.email, u.name 
FROM expense_approver_settings eas
JOIN users u ON eas.approver_id = u.id
WHERE eas.is_active = true
ORDER BY eas.approval_type, eas.priority;
```

### 2. 経費申請と承認フローの確認
```sql
-- 経費申請と承認情報を結合して確認
SELECT 
    e.id as expense_id,
    e.user_id,
    e.title,
    e.status as expense_status,
    ea.approval_type,
    ea.approver_id,
    ea.status as approval_status,
    u.email as approver_email
FROM expenses e
LEFT JOIN expense_approvals ea ON e.id = ea.expense_id
LEFT JOIN users u ON ea.approver_id = u.id
ORDER BY e.created_at DESC;
```

### 3. 承認者割り当ての検証
```sql
-- 提出済み経費申請に承認者が割り当てられているか確認
SELECT 
    e.id,
    e.status,
    COUNT(ea.id) as approval_count,
    STRING_AGG(ea.approval_type::text, ', ') as approval_types
FROM expenses e
LEFT JOIN expense_approvals ea ON e.id = ea.expense_id
WHERE e.status != 'draft'
GROUP BY e.id, e.status;
```

## 実装確認ポイント

1. **SubmitExpense処理の確認**
   - ExpenseServiceのSubmitExpenseメソッドで承認者設定を取得しているか
   - GetActiveApproversメソッドを呼び出しているか
   - expense_approvalsテーブルにレコードを作成しているか

2. **エラーハンドリング**
   - 承認者が設定されていない場合のエラー処理
   - トランザクション処理の確認

3. **テストケース**
   - 承認者が正しく割り当てられるケース
   - 承認者が設定されていない場合のエラーケース
   - 複数の承認者がいる場合の優先順位確認