# 通知優先度のDB制約違反修正パターン

## 問題パターン
通知作成時に"notifications_priority_check"制約違反エラーが発生する場合

## 原因
notificationsテーブルのpriorityカラムは'low', 'medium', 'high'のみ許可されているが、
コードで無効な値（'normal', 'urgent'など）を設定している。

## 修正方法
### 使用すべき定数
- `model.NotificationPriorityLow` - 低優先度
- `model.NotificationPriorityMedium` - 中優先度  
- `model.NotificationPriorityHigh` - 高優先度

### 使用してはいけない定数
- `model.NotificationPriorityNormal` - 'normal'として送信される（無効）
- `model.NotificationPriorityUrgent` - 'urgent'として送信される（無効）

## 修正例
```go
// ❌ 誤り
notification := &model.Notification{
    Priority: model.NotificationPriorityNormal,
}

// ✅ 正しい
notification := &model.Notification{
    Priority: model.NotificationPriorityMedium,
}
```

## 確認方法
1. notificationsテーブルの制約を確認
2. 使用している優先度定数が有効な値にマッピングされているか確認
3. 新しい通知機能追加時は必ず有効な3つの定数のいずれかを使用