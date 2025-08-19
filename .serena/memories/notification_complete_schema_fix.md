# notificationsテーブル完全スキーマ修正

## 問題概要
2025-01-19に発覚。notificationsテーブルに複数のカラムが欠落していた。

## 欠落していたカラム
1. recipient_id VARCHAR(255) - 受信者ID
2. status VARCHAR(20) - 通知ステータス
3. metadata JSON - メタデータ
4. read_at TIMESTAMP(3) - 既読日時

## 修正内容
### マイグレーション300004
- recipient_idカラム追加
- インデックスと外部キー制約設定

### マイグレーション300005
- statusカラム追加（デフォルト: 'unread'）
- CHECK制約追加（'unread', 'read', 'hidden'）
- metadataカラム追加（JSON型）
- read_atカラム追加

## 教訓
- モデル定義の全フィールドを確認する必要がある
- 1つのエラーが解決しても、関連する他のエラーも調査すべき
- 段階的な修正アプローチが有効

## 関連文書
- 修正レポート: bug-fix_20250119_2118.md
- マイグレーション: 300004, 300005