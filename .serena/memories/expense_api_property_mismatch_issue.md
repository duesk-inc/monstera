# 経費API プロパティ名不整合パターン

## 問題の概要
expense.ts内で型定義の重複と、プロパティ名の不整合により実行時エラーが発生。

## 発生日
2025-01-19

## 問題詳細
1. **型定義の重複**
   - `src/lib/api/expense.ts` 内で独自のExpenseListResponse型定義
   - `src/types/expense.ts` にも正式なExpenseListResponse型定義
   - 両者でプロパティ名が異なる（expenses vs items）

2. **実際のエラー**
   - mapperは正式な型定義（items）に従って実装
   - 使用箇所では独自定義（expenses）に基づいてアクセス
   - result.expenses.lengthでundefinedエラー

## 教訓
- 型定義は必ず一元管理する
- 同じ名前の型を複数箇所で定義しない
- mapperとAPIクライアントは同じ型定義を使用する

## 防止策
1. TypeScript strictモードの活用
2. 型定義の重複チェック
3. APIレスポンスの変換処理のテスト必須