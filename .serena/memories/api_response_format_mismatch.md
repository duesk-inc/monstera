# APIレスポンス形式の不一致パターン

## 問題パターン
APIエンドポイントを変更した際に、レスポンス形式の違いを考慮せずに実装すると、予期しないエラーが発生する。

## 具体例
### ケース: 週報API（2025-08-18）
- **変更内容**: `/weekly-reports/by-date-range` → `/weekly-reports`
- **問題**: 
  - 前者: 単一の週報データを返す想定
  - 後者: 週報リスト（配列）を返す
- **影響**: Invalid Dateエラー、RangeError発生

### レスポンス形式の例
```javascript
// リスト形式
{
  reports: [{...}],
  total: 1,
  page: 1,
  limit: 10
}

// 単一オブジェクト形式
{
  id: "123",
  startDate: "2025-08-11",
  endDate: "2025-08-17",
  dailyRecords: [...]
}
```

## 防止策
1. **APIエンドポイント変更前のチェックリスト**
   - [ ] レスポンス形式の確認
   - [ ] リスト vs 単一オブジェクト
   - [ ] プロパティ名の違い
   - [ ] ネストレベルの違い

2. **実装時の注意点**
   - レスポンスの型定義を明確にする
   - 変換処理で形式の違いを吸収する
   - 適切なエラーハンドリング

3. **デバッグ時のポイント**
   - console.logで生データを確認
   - 変換前後のデータ構造を比較
   - Invalid Date等の型エラーに注意

## 関連ファイル
- `frontend/src/lib/api/weeklyReport.ts`
- `frontend/src/components/features/weeklyReport/WeekSelector.tsx`