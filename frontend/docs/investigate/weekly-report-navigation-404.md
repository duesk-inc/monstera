# 週報ナビゲーション404エラー調査報告

## 調査日時
2025-08-18

## 問題の概要
週報提出画面の次週・前週ボタンを押下すると404エラーが発生し、機能が正常に動作しない。

## エラー詳細
- **エラー箇所**: `src/lib/api/weeklyReport.ts:513` の `getWeeklyReportByDateRange` 関数
- **HTTPステータス**: 404 Not Found
- **リクエストURL**: `/api/v1/weekly-reports/by-date-range?start_date=2025-08-25&end_date=2025-08-31`

## 根本原因
フロントエンドとバックエンドのAPIエンドポイント不一致

### フロントエンド側の実装
```typescript
// src/lib/api/weeklyReport.ts:494
const response = await client.get(`${WEEKLY_REPORT_API.LIST}/by-date-range?${params.toString()}`, { signal });
```
- `WEEKLY_REPORT_API.LIST` = `/weekly-reports`
- 実際のリクエスト: `/api/v1/weekly-reports/by-date-range`

### バックエンド側の実装
```go
// backend/internal/routes/weekly_report_refactored_routes.go:26
userReports.GET("", weeklyReportHandler.GetUserWeeklyReports)
```
- エンドポイント: `/api/v1/weekly-reports` （`/by-date-range`サブパスなし）
- `start_date`と`end_date`クエリパラメータは受け付ける

## 問題の詳細分析

### 1. APIエンドポイントの相違
- **フロントエンド期待**: `/weekly-reports/by-date-range`
- **バックエンド実装**: `/weekly-reports` (クエリパラメータで日付範囲指定)

### 2. バックエンドの対応機能
`GetUserWeeklyReports`ハンドラーは以下のクエリパラメータを受け付ける：
```go
// backend/internal/handler/weekly_report_refactored_handler.go:64-71
params := &service.ListParams{
    Page:      h.getIntQuery(c, "page", 1),
    Limit:     h.getIntQuery(c, "limit", 20),
    Status:    c.Query("status"),
    StartDate: c.Query("start_date"),  // ✓ 対応済み
    EndDate:   c.Query("end_date"),    // ✓ 対応済み
    Search:    c.Query("search"),
}
```

## 修正方法

### オプション1: フロントエンドの修正（推奨）
`src/lib/api/weeklyReport.ts`の`getWeeklyReportByDateRange`関数を修正：

```typescript
// 現在の実装（誤り）
const response = await client.get(`${WEEKLY_REPORT_API.LIST}/by-date-range?${params.toString()}`, { signal });

// 修正後
const response = await client.get(`${WEEKLY_REPORT_API.LIST}?${params.toString()}`, { signal });
```

**メリット**:
- バックエンドの変更不要
- 既存のAPIエンドポイントを活用
- 最小限の変更で修正可能

### オプション2: バックエンドに新規エンドポイント追加
```go
// 新規エンドポイントを追加
userReports.GET("/by-date-range", weeklyReportHandler.GetWeeklyReportByDateRange)
```

**デメリット**:
- 冗長なエンドポイント（既存機能と重複）
- バックエンドの変更が必要
- APIの一貫性が損なわれる

## 推奨アクション
1. フロントエンドの`getWeeklyReportByDateRange`関数のURLを修正
2. 関連する他の日付範囲取得処理も確認・修正
3. 修正後、週報ナビゲーション機能をテスト

## 影響範囲
- `src/lib/api/weeklyReport.ts` - getWeeklyReportByDateRange関数
- `src/hooks/weeklyReport/useWeeklyReportData.ts` - 呼び出し元
- `src/hooks/useWeeklyReport.ts` - 呼び出し元

## テスト項目
1. 週報画面で次週ボタンクリック → 正常に次週データ取得
2. 週報画面で前週ボタンクリック → 正常に前週データ取得
3. 日付範囲指定での週報取得 → 正常にデータ取得
4. 存在しない週報の場合 → nullを返す（新規作成モード）