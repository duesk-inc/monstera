# DebugLogger.logメソッドエラー修正計画

## 修正実施日
2025-01-18

## 問題の概要
`DebugLogger`クラスに存在しない`log()`メソッドが46箇所で誤って使用されており、ランタイムエラーが発生。

## 修正パターン

### 基本的な置換ルール
```typescript
// ❌ 間違い（修正前）
DebugLogger.log('CATEGORY', 'message', data);

// ✅ 正しい（修正後）
DebugLogger.info(
  { category: 'CATEGORY', operation: 'Operation' },
  'message',
  data
);
```

### カテゴリ別の置換マッピング
| 元のカテゴリ文字列 | 新カテゴリ | オペレーション |
|------------------|-----------|--------------|
| 'EXPENSE' | 'API' | 'Create/Update/Delete' |
| 'EXPENSE_SUMMARY' | 'API' | 'Read' |
| 'EXPENSE_LIMIT' | 'API' | 'Check' |
| 'APPROVER' | 'API' | 'Update' |
| 'COMPONENT' | 'UI' | 'Load' |

## 影響ファイルと修正箇所数
1. `adminExpense.ts` - 18箇所
2. `expenseApproverSetting.ts` - 10箇所
3. `expenseLimit.ts` - 8箇所
4. `expenseSummary.ts` - 5箇所
5. `useExpenseApproverAdmin.ts` - 3箇所
6. `CertificationInput.tsx` - 1箇所
7. `TechnologyInput.tsx` - 1箇所

## 段階的修正手順

### Phase 1: 緊急修正（30分）
- 最も影響の大きい`expenseSummary.ts`と`expenseLimit.ts`を優先修正
- ダッシュボード機能の復旧を確認

### Phase 2: 全体修正（45分）
- 残りの全ファイルを系統的に修正
- 各ファイル修正後に構文チェック実施

### Phase 3: 予防措置（30分）
- TypeScript型定義の強化
- ESLintルールの追加
- CI/CDパイプラインでのチェック追加

## テスト確認項目
- [ ] TypeScriptコンパイル成功
- [ ] Lintエラーなし
- [ ] ダッシュボード正常表示
- [ ] コンソールエラーなし
- [ ] E2Eテストパス

## 注意事項
- 修正時は必ず`DebugLogger.info()`または`DebugLogger.debug()`を使用
- `DebugLogger.log()`は絶対に使用しない
- カテゴリとオペレーションの形式を統一する

## 関連ドキュメント
- 調査レポート: `docs/investigate/bug-investigate_20250118_074500.md`
- 修正計画: `docs/plan/bug-plan_20250118_075000.md`

## 次回同様のエラーを防ぐために
1. 新規APIクライアント作成時は必ず既存のDebugLogger使用例を参照
2. PRレビュー時にDebugLoggerの使用方法を確認
3. 定期的にgrepで`DebugLogger.log`の誤用をチェック