# 週報画面デフォルト時間設定問題の調査報告

## 調査日時
2025-01-22

## 問題の概要
エンジニア画面の週報画面（weekly-report）で、デフォルト設定の時間（出勤、退勤、休憩）が取得されていない、もしくは画面に反映されていない。

## 調査結果

### 1. 問題の根本原因
**主要原因**: フロントエンドの API エンドポイント定義に不足がある

1. `frontend/src/constants/api.ts` に `WEEKLY_REPORT_API.TEMPLATE` エンドポイントが定義されていない
2. `frontend/src/lib/api/weeklyReport.ts:624` で `WEEKLY_REPORT_API.TEMPLATE` を使用しているが、存在しないためエラーが発生
3. バックエンドに対応するエンドポイントの実装が見つからない

### 2. 現在の処理フロー

#### フロントエンド側
1. **週報ページ** (`frontend/src/app/(authenticated)/(engineer)/weekly-report/page.tsx`)
   - `useDefaultSettings` フックを使用してデフォルト設定を取得（58-67行目）
   - 初期データ読み込み時に `loadDefaultSettings()` を呼び出し（136-138行目）

2. **useDefaultSettings フック** (`frontend/src/hooks/weeklyReport/useDefaultSettings.ts`)
   - `getUserDefaultWorkSettings()` APIを呼び出し（57行目）
   - エラー時はデフォルト値を返す（35-40行目）
   - エラーログ: "デフォルト勤務時間設定の読み込みに失敗しました"（76行目）

3. **API クライアント** (`frontend/src/lib/api/weeklyReport.ts`)
   - `getUserDefaultWorkSettings` 関数（620-654行目）
   - `WEEKLY_REPORT_API.TEMPLATE` エンドポイントを使用（624行目）
   - エラー時のフォールバック処理あり（647-652行目）

4. **週報データ生成時** (`frontend/src/hooks/weeklyReport/useWeeklyReportDefault.ts`)
   - `generateDailyRecordsFromDateRange` 関数でデフォルト設定を適用（35-89行目）
   - デフォルト設定が null の場合は `DEFAULT_WORK_TIME` 定数を使用（64-74行目）

### 3. 欠落している実装

#### フロントエンド
1. `frontend/src/constants/api.ts` の `WEEKLY_REPORT_API` オブジェクトに以下が不足：
   - `TEMPLATE: '/api/v1/weekly-reports/template'`
   - `SUBMIT: '/api/v1/weekly-reports/:id/submit'`
   - `UPDATE` の正しい定義: `/api/v1/weekly-reports/:id`

#### バックエンド
1. `/api/v1/weekly-reports/template` エンドポイントの実装が見つからない
2. デフォルト勤怠設定を管理するモデル、サービス、ハンドラーが実装されていない可能性

### 4. 影響範囲
- 新規週報作成時に平日のデフォルト時間が空欄になる
- 一括設定機能でデフォルト値が正しく設定されない
- デフォルト設定の保存/読み込み機能が動作しない

## 修正案

### 即時対応（フロントエンドのみ）
1. `frontend/src/constants/api.ts` を修正：
```typescript
export const WEEKLY_REPORT_API = {
  BASE: `/api/${API_VERSION}/weekly-reports`,
  CREATE: `/api/${API_VERSION}/weekly-reports`,
  UPDATE: `/api/${API_VERSION}/weekly-reports/:id`,
  LIST: `/api/${API_VERSION}/weekly-reports`,
  DETAIL: `/api/${API_VERSION}/weekly-reports/:id`,
  SUBMIT: `/api/${API_VERSION}/weekly-reports/:id/submit`,
  TEMPLATE: `/api/${API_VERSION}/weekly-reports/template`,
} as const;
```

### 完全な修正（バックエンドも含む）
1. バックエンドに `/api/v1/weekly-reports/template` エンドポイントを実装
2. ユーザーごとのデフォルト勤怠設定を保存するDBテーブルを作成
3. 対応するハンドラー、サービス、リポジトリを実装

## 推奨事項
1. まずフロントエンドの API 定義を修正して、エラーを解消
2. バックエンドの実装状況を確認し、必要に応じて実装を追加
3. デフォルト設定機能の要件を再確認し、完全な実装計画を立てる