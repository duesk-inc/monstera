# バグ調査レポート: 経費申請画面表示エラー

## 発生日時
2025-01-19 19:04

## エラー概要
経費申請画面の表示時に「Cannot read properties of undefined (reading 'length')」エラーが発生

## エラー詳細
- **エラーメッセージ**: `TypeError: Cannot read properties of undefined (reading 'length')`
- **発生箇所**: `src/lib/api/expense.ts:212:32` (getExpenseList関数)
- **影響範囲**: 経費申請一覧画面の表示が不可能

## 根本原因
**プロパティ名の不整合**が原因です。

### 詳細分析

1. **型定義の重複と不整合**
   - `src/lib/api/expense.ts` 内で独自のExpenseListResponse型定義（75行目）
     ```typescript
     expenses: Expense[]  // ← ローカル定義
     ```
   - `src/types/expense.ts` で正式なExpenseListResponse型定義（92行目）
     ```typescript
     items: ExpenseData[]  // ← 正式な定義
     ```

2. **mapperの実装**
   - `src/utils/expenseMappers.ts` の mapBackendExpenseListToExpenseList関数は正式な型定義に従って実装
   ```typescript
   return {
     items: backendResponse.items.map(...),  // ← itemsプロパティで返す
     total: ...,
     page: ...,
     limit: ...,
     totalPages: ...
   }
   ```

3. **エラー発生箇所**
   - `src/lib/api/expense.ts:212` で存在しないプロパティにアクセス
   ```typescript
   { count: result.expenses.length }  // ← expensesは存在しない（itemsが正しい）
   ```

## データフロー分析
```
1. バックエンド → 200 OK レスポンス（正常）
   └─ count: 0, total: 0 のデータ

2. フロントエンド getExpenseList関数
   └─ response.data.data を mapBackendExpenseListToExpenseList に渡す

3. mapBackendExpenseListToExpenseList関数
   └─ { items: [], total: 0, ... } を返す（正常）

4. getExpenseList関数 212行目
   └─ result.expenses.length にアクセス → undefined.length でエラー
```

## 影響範囲
1. **直接影響**
   - getExpenseList関数（192-220行）
   - getExpenses関数（164-189行） - 同様の問題あり（181行目）

2. **利用箇所**
   - 経費申請一覧画面
   - useExpenses React Queryフック
   - 経費関連のすべての画面表示

## 修正方法
expense.ts内のコードを修正：
- 181行目: `result.expenses.length` → `result.items.length`
- 212行目: `result.expenses.length` → `result.items.length`
- 型定義の重複を解消（75-81行目の独自定義を削除し、types/expenseから正式な型をインポート）

## 再発防止策
1. 型定義の一元管理（重複定義の禁止）
2. TypeScriptの型チェックを厳格化
3. APIレスポンスのマッピング関数のテスト追加

## 検証済み項目
- [x] エラーの直接的な原因: プロパティ名の不整合
- [x] エラーが発生する条件: getExpenseList関数の実行時（必ず発生）
- [x] 影響を受ける機能: 経費申請一覧、統計表示
- [x] データ整合性への影響: なし（表示のみの問題）
- [x] セキュリティへの影響: なし
- [x] 回避策: なし（コード修正が必要）