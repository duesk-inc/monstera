# 週報画面のdailyRecordsが空になる問題の修正

## 問題の概要
週報画面の初回表示時に、バックエンドから週報データは取得できているが、画面に日次レコード（dailyRecords）が表示されない問題が発生。

## 根本原因
バックエンドのList API (`/api/v1/weekly-reports`) はパフォーマンス最適化のため、一覧表示用の簡略化されたレスポンスを返しており、`daily_records`フィールドを含まない設計になっていた。

しかし、フロントエンドの週報画面では詳細データ（daily_records含む）が必要であり、List APIの簡略化されたデータでは画面表示に必要な情報が不足していた。

## 解決方法

### 1. 新しい関数を追加
`frontend/src/lib/api/weeklyReport.ts`に`getWeeklyReportById`関数を追加：
- `/api/v1/weekly-reports/:id`エンドポイントを使用
- 週報の詳細データ（daily_records含む）を取得

### 2. 既存関数の修正
`getWeeklyReportByDateRange`関数を修正：
1. 最初にList APIで週報のIDを取得
2. IDが取得できたら、詳細APIを呼んでフルデータを取得
3. これにより、daily_recordsを含む完全なデータが取得可能に

## 影響範囲
- 週報画面の初回表示
- 週選択時の週報データ取得
- 今週/前週/次週ボタンのデータ取得

## 修正ファイル
- `/Users/daichirouesaka/Documents/90_duesk/monstera/frontend/src/lib/api/weeklyReport.ts`

## 今後の注意点
- List APIは一覧表示用（軽量）
- Detail APIは詳細表示用（フルデータ）
- 用途に応じて適切なAPIを選択する必要がある