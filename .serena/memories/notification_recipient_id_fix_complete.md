# notificationsテーブル recipient_id カラム追加修正完了

## 修正概要
2025-01-19に実施。notificationsテーブルにrecipient_idカラムを追加し、通知機能を復旧。

## 実施内容
### マイグレーション作成
- ファイル: `backend/migrations/300004_add_recipient_id_to_notifications.up.sql`
- 内容: 
  - recipient_id VARCHAR(255) NULL カラム追加
  - インデックス作成 (idx_notifications_recipient)
  - 外部キー制約追加 (fk_notifications_recipient)
- ロールバック: downマイグレーションも準備

### 適用結果
- マイグレーション番号: 300004
- 実行時間: 47.452417ms
- 既存データへの影響: なし（NULLABLEカラム）
- バックエンド再起動: 実施済み

## 検証ポイント
1. スキーマ確認: `\d notifications`でカラム存在確認
2. 既存データ確認: recipient_id=NULLで正常
3. 通知作成テスト: 経費申請提出で500エラーが発生しないこと

## 今後の作業
- Phase 2: 通知機能の完全な動作確認
- Phase 3: 他のテーブルのスキーマ整合性確認

## 関連文書
- 調査: bug-investigate_20250119_2053.md
- 計画: bug-plan_20250119_2100.md
- 修正: bug-fix_20250119_2118.md

## 教訓
- モデル変更時は必ずマイグレーションファイルも作成
- NULLABLEカラムとして追加することで既存データへの影響を最小化
- downマイグレーションも必ず準備してロールバック可能にする