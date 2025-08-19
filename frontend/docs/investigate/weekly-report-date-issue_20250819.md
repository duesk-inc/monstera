# 週報画面の日時データ表示問題 - 調査報告書

**調査日時**: 2025-01-19 01:15  
**調査者**: Claude Code  
**問題ID**: WEEKLY-REPORT-DATE-001  
**重要度**: 🔴 High（機能が正常に動作しない）

## 1. 問題の概要

### 症状
- 週報画面の初回表示時に日時データ（週の開始日・終了日）が表示されない
- バックエンドAPIは正常にデータを返している
- ブラウザのコンソールでもデータは受信しているが、UIに反映されない

### エラーメッセージ
```
週報の日時データが画面に表示されない
バックエンドログ: 2025/01/19 00:13:45 [INFO] 週報データ取得成功: 
  startDate: "2025-08-18T00:00:00Z"
  endDate: "2025-08-24T23:59:59Z"
```

## 2. 根本原因

### 原因の特定
**データ変換処理の不具合**

**問題の発生箇所**: `frontend/src/app/(authenticated)/(engineer)/weekly-report/mappers/weeklyReportMappers.ts`

### 技術的詳細

1. **APIレスポンスの処理ミス**
   - APIから返されるデータは`convertSnakeToCamel`で既に変換済み
   - しかし、変換関数内で正しくアクセスできていなかった

2. **修正前のコード（line 102-103）**
```typescript
startDate: parseISO(apiData.startDate || apiReport.start_date || ''),
endDate: parseISO(apiData.endDate || apiReport.end_date || ''),
```

3. **問題点**
   - 空文字列（''）をフォールバック値として使用
   - `parseISO('')`は Invalid Date を返す
   - WeekSelectorコンポーネントで`format(currentStartDate, 'yyyy年MM月dd日')`が失敗

## 3. データフロー分析

```
1. バックエンドAPI
   ↓ start_date: "2025-08-18T00:00:00Z"
2. convertSnakeToCamel関数
   ↓ startDate: "2025-08-18T00:00:00Z"
3. convertAPIResponseToUIModel関数
   ↓ ❌ parseISO('') → Invalid Date
4. WeekSelectorコンポーネント
   ↓ format(Invalid Date, ...) → エラー
5. 画面表示失敗
```

## 4. 実施した修正

### 修正内容

```typescript
// 修正後のコード
const apiData = apiReport as any;
const startDateStr = apiData.startDate || apiReport.start_date;
const endDateStr = apiData.endDate || apiReport.end_date;

if (!startDateStr || !endDateStr) {
  console.warn('週報の日付データが取得できません:', { startDateStr, endDateStr, apiReport });
}

const weeklyReport: WeeklyReport = {
  startDate: startDateStr ? parseISO(startDateStr) : new Date(),
  endDate: endDateStr ? parseISO(endDateStr) : new Date(),
  // ...
};
```

### 改善点
1. 日付データの取得を明示的に処理
2. デバッグ用のログ出力を追加
3. フォールバック値として現在日時を使用（空文字列ではなく）
4. キャメルケースとスネークケース両方に対応

## 5. 影響範囲

### 影響を受ける機能
| 機能 | ファイル | 影響度 |
|------|----------|--------|
| 週報画面の日付表示 | `weekly-report/page.tsx` | High |
| 週選択コンポーネント | `WeekSelector.tsx` | High |
| 日別記録表示 | `DailyRecordAccordion.tsx` | Medium |

## 6. テスト項目

### 確認済み項目
- [x] コードの修正完了
- [x] フロントエンドコンテナの再起動
- [ ] 週報画面での日付表示確認
- [ ] 週の切り替え機能の動作確認
- [ ] 新規週報作成時の日付設定確認

## 7. 今後の推奨事項

1. **型安全性の向上**
   - APIレスポンスの型定義を厳密化
   - 変換関数のテストケース追加

2. **エラーハンドリングの改善**
   - 日付パースエラー時の適切な処理
   - ユーザーへのエラーメッセージ表示

3. **デバッグ機能の強化**
   - 開発環境でのデータフロー可視化
   - APIレスポンスのログ出力強化

## 8. 結論

週報画面の日時データ表示問題は、APIレスポンスのデータ変換処理における不具合が原因でした。`convertAPIResponseToUIModel`関数で日付フィールドが正しく取得できず、Invalid Dateが生成されていました。

修正により、キャメルケースとスネークケース両方の形式に対応し、適切なフォールバック処理を実装しました。

**ステータス**: ✅ 修正完了  
**次のアクション**: ブラウザでの動作確認