# 開発モードのユーザーID形式問題

## 問題の概要
開発モードでのログイン時に、ユーザーIDの形式がデータベース制約と不一致になり、audit_logsテーブルへの挿入が失敗する問題。

## 詳細
- **発生日**: 2025-08-13
- **影響**: 開発環境でログインができない

## 根本原因
1. **ユーザーID長の問題**
   - 開発モードで生成: `dev-00000000-0000-0000-0000-000000000004` (44文字)
   - audit_logsテーブル: `user_id CHAR(36)` (36文字制限)
   - エラー: `ERROR: value too long for type character(36)`

2. **トークン形式の問題**
   - 開発モードのトークン: `dev-access-token-{userID}-{timestamp}`
   - フロントエンド期待値: JWT形式（3セグメント: header.payload.signature）

## 関連ファイル
- `backend/internal/service/cognito_auth_service.go` - 開発モードのユーザーID生成
- `backend/migrations/200018_create_audit_logs_table.up.sql` - テーブル定義
- `frontend/src/middleware.ts` - トークン検証ロジック

## 修正方針
1. 開発モードでも36文字のUUID形式を使用（dev-接頭辞を削除）
2. シードデータと同じユーザーIDを使用
3. トークン形式をJWT準拠または検証ロジックを調整

## 注意点
- 同様の問題は他のテーブルの外部キー制約でも発生する可能性がある
- 開発モードとCognitoモードの整合性を保つことが重要