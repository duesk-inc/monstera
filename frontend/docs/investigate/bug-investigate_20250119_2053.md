# バグ調査レポート: 経費申請提出時の500エラー

## 発生日時
2025-01-19 20:53

## エラー概要
経費申請作成画面で「作成して提出」ボタンを押下すると、フロントエンドで500エラー（NETWORK_ERROR）が発生。
データ（経費申請）自体は正常に登録されているが、通知の作成で失敗している。

## エラー詳細
### フロントエンドエラー
- **HTTPステータス**: 500 (Internal Server Error)
- **エラーコード**: `NETWORK_ERROR`
- **メッセージ**: `ネットワークエラーが発生しました。接続を確認してください。`
- **発生箇所**: expense.ts:210 (getExpenseList関数)

### バックエンドエラー
- **エラーメッセージ**: `column "recipient_id" of relation "notifications" does not exist (SQLSTATE 42703)`
- **発生箇所**: 
  - `service/notification_service.go:112` (CreateNotification)
  - `service/notification_service.go:128` (CreateInBatches)
- **経費ID**: e8d0f992-f803-49ac-a49c-fbcfeca792b7 (正常に作成済み)

## 根本原因
**データベーススキーマとコードの不整合**が原因です。

### 詳細分析

1. **モデル定義の状態**
   - `model/notification.go`の102行目で`RecipientID`フィールドが定義されている
   ```go
   RecipientID *string `gorm:"type:varchar(255);index:idx_notifications_recipient" json:"recipient_id"`
   ```

2. **サービス層の実装**
   - `notification_service.go`の239行目で`RecipientID`を設定
   ```go
   notification := &model.Notification{
       RecipientID: &approverID,
       // ...
   }
   ```

3. **データベーススキーマの実態**
   - マイグレーション`000012_create_notifications_tables.up.sql`では`recipient_id`カラムが**存在しない**
   - notificationsテーブルのカラム一覧：
     - id, title, message, notification_type, priority
     - created_at, expires_at, reference_id, reference_type
     - updated_at, deleted_at
   - **recipient_idカラムが定義されていない**

4. **エラー発生のメカニズム**
   - 経費申請の提出処理（SubmitExpense）は成功
   - 承認者への通知作成（NotifyExpenseSubmitted）でrecipient_idカラムへの挿入を試みる
   - データベースにrecipient_idカラムが存在しないためSQL実行エラー
   - 通知作成は失敗するが、経費申請自体は既に保存済み
   - フロントエンドには500エラーが返される

## データフロー分析
```
1. フロントエンド: 「作成して提出」ボタンクリック
   └─ POST /api/v1/expenses/{id}/submit

2. バックエンド: ExpenseHandler.SubmitExpense
   └─ expenseService.SubmitExpense
      ├─ 経費データの更新（成功）✓
      └─ notificationService.NotifyExpenseSubmitted
         └─ CreateBulkNotifications
            └─ db.Create(notification) ← ここでエラー発生 ✗
               └─ SQL INSERT: recipient_id カラムが存在しない

3. レスポンス: 500 Internal Server Error
```

## 影響範囲
1. **直接影響**
   - 経費申請の提出時に必ず500エラーが表示される
   - 通知機能が完全に動作しない
   - 承認者に通知が届かない

2. **データの整合性**
   - 経費データ自体は正常に保存される（問題なし）
   - 通知データは作成されない
   - トランザクション管理により不整合は発生していない

3. **影響を受ける機能**
   - 経費申請の提出フロー
   - 経費申請の承認/却下通知
   - 経費限度額警告通知
   - その他すべての通知機能

## 検証済み項目
- [x] エラーの直接的な原因: データベーススキーマの不整合
- [x] エラーが発生する条件: notificationsテーブルへのINSERT時（必ず発生）
- [x] 影響を受ける機能: すべての通知機能
- [x] データ整合性への影響: 経費データは正常、通知データのみ作成失敗
- [x] セキュリティへの影響: なし
- [x] 回避策: なし（データベース修正が必要）

## 推奨される修正方法
### Option 1: マイグレーションファイルの追加（推奨）
新しいマイグレーションファイルを作成して`recipient_id`カラムを追加する。
```sql
ALTER TABLE notifications 
ADD COLUMN recipient_id VARCHAR(255) NULL,
ADD INDEX idx_notifications_recipient (recipient_id);

-- 外部キー制約も追加
ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_recipient 
FOREIGN KEY (recipient_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;
```

### Option 2: 既存マイグレーションの修正
開発環境のみの場合、`000012_create_notifications_tables.up.sql`を修正して、
データベースを再作成する。

### Option 3: モデルとサービスの修正
`recipient_id`を使わない設計に変更する（非推奨：大規模な変更が必要）

## 再発防止策
1. **マイグレーション管理の改善**
   - モデル変更時は必ずマイグレーションファイルも作成
   - マイグレーションの実行状態を定期的に確認

2. **テスト強化**
   - 通知作成のユニットテスト追加
   - 統合テストで通知機能を検証

3. **CI/CDパイプライン**
   - マイグレーション実行の自動化
   - スキーマとモデルの整合性チェック

## 類似の問題の可能性
- 他のテーブルでもモデル定義とスキーマの不整合がある可能性
- 特にCognito移行後に追加されたフィールドは要確認
- notification_historiesテーブルは`recipient_id`を持っているので、設計上は必要なカラム

## 次のアクション
`BUG-FIX`フェーズへ移行し、マイグレーションファイルの作成と適用を行う。