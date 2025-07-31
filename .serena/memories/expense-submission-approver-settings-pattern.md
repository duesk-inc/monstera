# 経費申請提出エラーパターン: 承認者設定の不在

## エラーパターン
- **エラーコード**: `EXPENSE_NO_APPROVERS_CONFIGURED`
- **エラーメッセージ**: 「管理部承認者が設定されていません」

## 原因
マイグレーション200072 (`seed_expense_approver_settings_initial.up.sql`) が未実行の場合、`expense_approver_settings`テーブルに承認者設定データが存在せず、経費申請の提出ができない。

## 解決方法
```bash
make migrate-up
```

## 確認SQL
```sql
-- 承認者設定の確認
SELECT approval_type, approver_id, is_active, priority 
FROM expense_approver_settings 
ORDER BY approval_type, priority;
```

## 関連ファイル
- マイグレーション: `backend/migrations/200072_seed_expense_approver_settings_initial.up.sql`
- エラー発生箇所: `backend/internal/repository/expense_approval_repository.go:415-425`

## 注意点
新規環境構築時は必ずマイグレーションを最新まで実行すること。