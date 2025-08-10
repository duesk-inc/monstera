# システムユーザー要件分析（2025-01-10）

## 概要
システムユーザー（ID: system-00000000-0000-0000-0000-000000000000）の必要性について調査を実施。

## 使用箇所
### audit_log.goミドルウェア
- ログイン失敗時にシステムユーザーIDを使用してaudit_logsに記録
- 認証前のアクションを記録する際に使用

## 現在の問題と解決
### 問題点
- audit_logsテーブルのuser_idに外部キー制約あり
- システムユーザーが存在しないと外部キー制約違反発生
- UUIDとCognito Subの型不一致があった

### 実施した修正
1. **audit_log.goミドルウェアをstring型に修正**
   - uuid.Nilの使用を廃止
   - Cognito Sub形式のシステムID（system-00000000-0000-0000-0000-000000000000）を使用

2. **userutil.goのGetUserIDFromContextをstring型に修正**
   - UUID型からstring型への変更
   - 戻り値を（uuid.UUID, bool）から（string, bool）に変更

3. **handler_util.goのGetAuthenticatedUserIDをstring型に修正**
   - UUID型からstring型への変更

4. **システムユーザーのマイグレーション作成**
   - 300001_create_system_user.up.sql
   - Cognito Sub形式のIDで統一

## 結論
- 開発環境ではシステムユーザーが必要（監査ログの外部キー制約のため）
- Cognito Sub形式のIDに統一完了
- 将来的にはaudit_logsのuser_idをNULL許可にする設計変更を検討すべき