# Cognito移行の現在状況（2025-08-05 18:36）

## 確認結果

### cognito_sub値の状況
- 全ユーザー数: 5
- cognito_sub設定済み: 2
- cognito_sub未設定: 3
  - a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11 (daichiro.uesaka@duesk.co.jp)
  - a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12 (test@duesk.co.jp)
  - a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13 (test2@duesk.co.jp)

### UUID型を使用しているモデル（未移行）
1. archive.go
2. engineer_proposal_question.go
3. expense_limit.go
4. invoice.go
5. notification.go
6. sales_activity.go

### 移行戦略
1. まずcognito_sub未設定のユーザーに仮の値を設定
2. 6つのモデルをstring型に移行
3. リポジトリ・サービス層の移行
4. 最終的にUserモデルを統合