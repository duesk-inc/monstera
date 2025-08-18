# 週報API修正パターン

## 修正履歴
### 2025-08-18: レスポンス形式の不一致修正

#### 問題
1. 404エラー修正でエンドポイントを変更
2. レスポンス形式の違いを考慮せず
3. Invalid Dateエラーが発生

#### 解決方法
```typescript
// リスト形式のレスポンスから単一オブジェクトを取得
const data = response.data;
if (data && data.reports && data.reports.length > 0) {
  const convertedReport = convertSnakeToCamel<ApiWeeklyReport>(data.reports[0]);
  // ...
}
return null; // 週報がない場合
```

## APIエンドポイントとレスポンス形式

### `/weekly-reports` (GET)
- **形式**: リスト
- **レスポンス**: `{reports: [], total, page, limit}`
- **用途**: 週報一覧取得、日付範囲指定可能

### 期待される週報オブジェクト
```typescript
{
  id: string,
  startDate: string,
  endDate: string,
  dailyRecords: [],
  weeklyRemarks: string,
  // ...
}
```

## チェックポイント
- [ ] エンドポイント変更時はレスポンス形式を確認
- [ ] リスト vs 単一オブジェクトの違いを意識
- [ ] 型定義とレスポンスの整合性を確認
- [ ] 空配列の場合の処理を考慮