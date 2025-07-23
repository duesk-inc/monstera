# 週報デフォルト勤務時間設定APIエンドポイントの修正

## 修正日時
2025-01-22

## 問題の詳細
フロントエンドで週報のデフォルト勤務時間設定を取得/保存するAPIエンドポイントが間違っていました。

### 誤っていたエンドポイント
- `/api/v1/weekly-reports/template`

### 正しいエンドポイント
- `/api/v1/weekly-reports/default-settings`

## 調査結果
バックエンドの実装を調査した結果、以下のことが判明しました：

1. **エンドポイントは既に実装済み**
   - `backend/cmd/server/main.go` (643-644行目) でルーティング定義
   - GET `/api/weekly-reports/default-settings` - デフォルト設定取得
   - POST `/api/weekly-reports/default-settings` - デフォルト設定保存

2. **実装詳細**
   - ハンドラー: `GetUserDefaultWorkSettings` / `SaveUserDefaultWorkSettings`
   - サービス層: 週報サービスに実装済み
   - リポジトリ層: `user_default_work_settings_repository.go`
   - データベース: `user_default_work_settings` テーブル

3. **データベース構造**
   ```sql
   - id: VARCHAR(36) PRIMARY KEY
   - user_id: VARCHAR(36) NOT NULL
   - weekday_start_time: VARCHAR(10) DEFAULT '09:00'
   - weekday_end_time: VARCHAR(10) DEFAULT '18:00'
   - weekday_break_time: DECIMAL(4,2) DEFAULT 1.00
   - created_at, updated_at: TIMESTAMP
   ```

## 実施した修正

### 修正ファイル
`frontend/src/constants/api.ts`

### 修正内容
```typescript
// 修正前
TEMPLATE: `/api/${API_VERSION}/weekly-reports/template`,

// 修正後
TEMPLATE: `/api/${API_VERSION}/weekly-reports/default-settings`,
```

## 効果
1. デフォルト勤務時間設定の取得・保存が正常に動作するようになります
2. 週報画面でユーザーごとのデフォルト設定が適用されます
3. 404エラーが解消されます

## テスト方法
1. 週報画面を開く
2. デフォルト設定ボタンをクリック
3. 時間を設定して保存
4. ページをリロードして設定が保持されることを確認
5. 新しい週報を作成した際にデフォルト値が適用されることを確認