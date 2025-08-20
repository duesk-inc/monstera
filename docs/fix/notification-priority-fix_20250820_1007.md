# 通知優先度DB制約違反の修正

## 修正日時
2025年1月20日 10:07

## 問題の概要
経費申請作成・提出時に通知作成でエラーが発生していた。

### エラーメッセージ
```
ERROR: new row for relation "notifications" violates check constraint "notifications_priority_check" (SQLSTATE 23514)
```

## 根本原因
1. **データベース制約**: notificationsテーブルのpriorityカラムは`'low'`, `'medium'`, `'high'`のみ許可
2. **コードの問題**: 
   - `NotificationPriorityNormal`を使用 → `"normal"`がDBに送信される
   - `NotificationPriorityUrgent`を使用 → `"urgent"`がDBに送信される
3. **マッピングの失敗**: model/notification.goで定義されたマッピングが正しく適用されていなかった

## 修正内容

### 1. notification_service.go（2箇所）
```go
// 修正前
Priority: model.NotificationPriorityNormal,  // Line 368
Priority: model.NotificationPriorityUrgent,  // Line 339

// 修正後
Priority: model.NotificationPriorityMedium,  // Line 368
Priority: model.NotificationPriorityHigh,    // Line 339
```

### 2. reminder_batch_service.go（1箇所）
```go
// 修正前
Priority: model.NotificationPriorityUrgent,  // Line 398

// 修正後
Priority: model.NotificationPriorityHigh,    // Line 398
```

## 影響範囲
- **NotifyExpenseLimitWarning**: 経費申請上限警告通知
- **NotifyExpenseLimitExceeded**: 経費申請上限超過通知
- **sendEscalation**: 週報エスカレーション通知

## テスト結果
- コンパイルエラー: なし
- バックエンドコンテナ: 正常再起動
- 通知作成: エラー解消（DB制約違反が発生しなくなった）

## 今後の対策
1. **定数の見直し**: `NotificationPriorityNormal`と`NotificationPriorityUrgent`の定義を削除または非推奨化を検討
2. **使用ガイドライン**: 開発チームに以下の使用を周知
   - 低優先度: `NotificationPriorityLow`
   - 中優先度: `NotificationPriorityMedium`
   - 高優先度: `NotificationPriorityHigh`
3. **コードレビュー**: 新しい通知機能追加時は、必ず有効な優先度定数を使用することを確認

## コミット情報
- コミットID: 634052a
- メッセージ: "fix(notification): 通知優先度のDB制約違反を修正"