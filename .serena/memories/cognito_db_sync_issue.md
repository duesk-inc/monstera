# CognitoとDBの同期問題

## 問題概要
CognitoローカルとPostgreSQLデータベース間でユーザーデータが同期されない問題が発生。

## 原因
1. Cognitoローカルは独自のデータストア（JSONファイル）を使用
2. データベースのusersテーブルとは独立して管理
3. ユーザー作成時に片方にしか登録されない

## 影響
- Cognitoで認証成功してもDBにユーザーが存在しないため401エラー
- `Failed to get user by Cognito sub`エラーが発生

## 解決策
### 短期的
- 手動でDBにユーザーを追加
- マイグレーションでシードデータを実行

### 長期的
- ユーザー登録APIでCognitoとDBの両方に登録
- Cognito PostConfirmationトリガーで自動同期
- 定期的な整合性チェック

## 注意点
- engineer_test@duesk.co.jpはシードデータに含まれていない
- マイグレーションがdirty状態になることがある