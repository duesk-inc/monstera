# notifications テーブル recipient_id カラム欠落問題

## 問題概要
2025-01-19に発覚。notificationsテーブルに`recipient_id`カラムが存在しないため、通知作成時に500エラーが発生する。

## 問題詳細
- **エラー**: `column "recipient_id" of relation "notifications" does not exist (SQLSTATE 42703)`
- **原因**: モデル定義には`RecipientID`フィールドがあるが、データベーススキーマには対応するカラムがない
- **影響**: すべての通知機能が動作しない

## 関連ファイル
- モデル定義: `backend/internal/model/notification.go`
- サービス実装: `backend/internal/service/notification_service.go`
- マイグレーション: `backend/migrations/000012_create_notifications_tables.up.sql`

## 修正方法
新しいマイグレーションファイルを作成して`recipient_id`カラムを追加：
```sql
ALTER TABLE notifications 
ADD COLUMN recipient_id VARCHAR(255) NULL,
ADD INDEX idx_notifications_recipient (recipient_id);

ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_recipient 
FOREIGN KEY (recipient_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;
```

## 教訓
- モデル変更時は必ずマイグレーションファイルも作成する
- GORMの自動マイグレーション機能に頼らず、明示的なマイグレーションファイルを管理する
- モデルとスキーマの整合性を定期的に確認する

## 関連調査
- 調査レポート: `docs/investigate/bug-investigate_20250119_2053.md`