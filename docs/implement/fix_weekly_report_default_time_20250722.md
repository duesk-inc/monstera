# 週報画面デフォルト時間設定問題の修正実装

## 実装日時
2025-01-22

## 実装内容

### 1. API エンドポイント定義の修正

#### 修正ファイル
`frontend/src/constants/api.ts`

#### 修正内容
`WEEKLY_REPORT_API` オブジェクトに不足していたエンドポイント定義を追加：

```typescript
export const WEEKLY_REPORT_API = {
  BASE: `/api/${API_VERSION}/weekly-reports`,
  CREATE: `/api/${API_VERSION}/weekly-reports`,
  UPDATE: `/api/${API_VERSION}/weekly-reports/:id`,  // :id パラメータを追加
  LIST: `/api/${API_VERSION}/weekly-reports`,
  DETAIL: `/api/${API_VERSION}/weekly-reports/:id`,  // :id パラメータを追加
  SUBMIT: `/api/${API_VERSION}/weekly-reports/:id/submit`,  // 新規追加
  TEMPLATE: `/api/${API_VERSION}/weekly-reports/template`,  // 新規追加
} as const;
```

### 2. 修正の効果
- TypeScript のコンパイルエラーが解消
- `getUserDefaultWorkSettings` 関数で正しいエンドポイントが参照される
- `submitWeeklyReport` 関数で正しいエンドポイントが参照される

### 3. 残課題

#### バックエンド実装
1. `/api/v1/weekly-reports/template` エンドポイントの実装が必要
   - GET: ユーザーのデフォルト勤怠設定を取得
   - POST: ユーザーのデフォルト勤怠設定を保存

2. データベース設計
   - `user_default_work_settings` テーブルの作成
   - ユーザーごとのデフォルト勤怠時間（出勤、退勤、休憩）を保存

3. 実装必要ファイル
   - `backend/internal/model/user_default_work_settings.go`
   - `backend/internal/repository/user_default_work_settings_repository.go`
   - `backend/internal/service/user_default_work_settings_service.go`
   - `backend/internal/handler/user_default_work_settings_handler.go`
   - マイグレーションファイル

### 4. 暫定対応
バックエンドが実装されるまでの間、フロントエンドは以下の動作をします：
- API エラー時は `DEFAULT_WORK_TIME` 定数の値を使用
- 出勤: 09:00
- 退勤: 18:00
- 休憩: 1時間

### 5. テスト方法
1. 週報画面を開く
2. ブラウザの開発者ツールでコンソールエラーを確認
3. `/api/v1/weekly-reports/template` への通信が 404 エラーになることを確認
4. それでも画面が正常に表示され、デフォルト値が設定されることを確認

## 次のアクション
1. バックエンドチームと連携して、template エンドポイントの実装優先度を確認
2. データベース設計のレビュー
3. API 仕様書の更新