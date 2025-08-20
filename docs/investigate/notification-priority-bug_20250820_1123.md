# 通知優先度制約違反エラー調査結果

## 調査日時
2025年1月20日 11:23

## エラー内容
```
ERROR: new row for relation "notifications" violates check constraint "notifications_priority_check" (SQLSTATE 23514)
```

## 根本原因
データベースの`notifications`テーブルの`priority`カラムに制約があり、`'low'`, `'medium'`, `'high'`のみを許可していますが、コード内で`NotificationPriorityNormal`（値: `'normal'`）が使用されている箇所が残っています。

## 影響箇所

### 1. notification_service.go (4箇所)
- 148行目: NotifyProposalStatusChange - 提案ステータス変更通知
- 207行目: NotifyQuestionAnswered - 質問回答通知
- 281行目: NotifyExpenseApproved - 経費承認通知
- 404行目: NotifyExpenseApprovalReminder - 経費承認催促通知

### 2. expense_service.go (1箇所)
- 3721行目: ProcessExpenseReminders - 経費申請期限リマインダー

### 3. expense_monthly_close_service.go (1箇所)
- 175行目: NotifyMonthlyCloseReminder - 月次締め処理リマインダー

## エラー発生パターン
1. 経費申請時の上限警告通知（修正済み）
2. 提案ステータス変更時の通知
3. 質問への回答通知
4. 経費承認関連の通知
5. 月次締め処理のリマインダー通知

## 修正方針
すべての`NotificationPriorityNormal`を以下のいずれかに置き換える：
- `NotificationPriorityLow` - 情報通知、リマインダー
- `NotificationPriorityMedium` - 通常の業務通知
- `NotificationPriorityHigh` - 重要な通知、要対応項目

### 推奨マッピング
- 提案ステータス変更 → `Medium`（通常業務）
- 質問回答通知 → `Medium`（通常業務）
- 経費承認完了 → `Medium`（通常業務）
- 経費承認催促 → `High`（要対応）
- 経費申請リマインダー → `High`（期限関連）
- 月次締めリマインダー → `High`（期限関連）

## 次のステップ
1. 全6箇所の`NotificationPriorityNormal`を適切な優先度に修正
2. Dockerコンテナの再ビルド
3. 動作確認テスト