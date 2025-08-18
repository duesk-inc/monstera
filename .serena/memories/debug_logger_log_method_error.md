# DebugLogger.logメソッドエラーパターン

## 問題概要
APIクライアントのリファクタリング時に、存在しない`DebugLogger.log()`メソッドを使用するコードが混入し、ランタイムエラーが発生。

## エラーメッセージ
```
TypeError: DebugLogger.log is not a function
```

## 原因
`DebugLogger`クラスには以下のメソッドが存在：
- `info()`, `debug()`, `error()`, `apiStart()`, `apiSuccess()`, `apiError()`

しかし`log()`メソッドは存在しない。

## 正しい使用方法
```typescript
// ❌ 間違い
DebugLogger.log('CATEGORY', 'message', data);

// ✅ 正しい
DebugLogger.info({ category: 'CATEGORY', operation: 'Operation' }, 'message', data);
// または
DebugLogger.debug({ category: 'CATEGORY', operation: 'Operation' }, 'message', data);
```

## 影響ファイル
- expenseSummary.ts
- expenseLimit.ts
- adminExpense.ts
- expenseApproverSetting.ts
- その他経費関連モジュール

## 予防策
1. TypeScriptの型チェック強化
2. DebugLoggerの使用方法統一
3. コードレビューでの確認

発見日: 2025-01-18