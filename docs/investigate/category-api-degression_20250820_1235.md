# 経費カテゴリAPI デグレーション調査結果

## 調査日時
2025年1月20日 12:35

## エラー内容
```javascript
useEnhancedErrorHandler.ts:135 Submission error in 経費カテゴリの取得: 
Error: 経費カテゴリ取得の取得に失敗しました: Cannot read properties of undefined (reading 'map')
    at handleApiError (error.ts:167:10)
    at getExpenseCategories (expense.ts:620:25)
```

## 根本原因

Phase 2の修正で導入した`extractDataFromResponse`ユーティリティが、カテゴリAPIのレスポンス構造と不整合を起こしています。

### 問題の詳細

1. **カテゴリAPIのレスポンス構造**
   ```json
   {
     "data": [
       { "id": "1", "code": "transport", "name": "交通費", ... },
       { "id": "2", "code": "meal", "name": "食費", ... }
     ]
   }
   ```

2. **`extractDataFromResponse`の動作**
   - `response.data.data`が存在する場合、それを返す
   - この場合、配列`[{...}, {...}]`のみが返される

3. **型定義の不整合**
   ```typescript
   interface ExpenseCategoryApiResponse {
     data: Array<{...}>  // dataプロパティを期待
   }
   ```

4. **エラー発生箇所** (expense.ts:600)
   ```typescript
   const convertedData = convertSnakeToCamel<ExpenseCategoryApiResponse>(responseData);
   // convertedData = [{...}, {...}] (配列)
   
   const result = convertedData.data.map(category => ({  // ERROR: convertedData.dataはundefined
   ```

## 影響範囲

### 直接影響を受ける機能
- 経費申請画面のカテゴリ選択
- 経費新規作成画面のカテゴリ選択
- カテゴリマスタ関連のすべての画面

### 修正が必要な箇所
1. **getExpenseCategories関数** (expense.ts:580-622)
   - 現在の実装では`extractDataFromResponse`が配列を返すのに、`data`プロパティを期待している

### 潜在的な問題箇所
まだ`extractDataFromResponse`に移行していない関数（今後の修正で同様の問題が発生する可能性）：
- updateExpense (341行目)
- submitExpense (391行目)
- approveExpense (418行目)
- rejectExpense (445行目)
- getExpenseStats (472行目)
- getExpenseTemplates (657行目)
- createExpenseTemplate (669行目)
- generateUploadURL (691行目)
- completeUpload (703行目)

## デグレーションの発生経緯

### Phase 1 (正常動作)
```typescript
const response = await client.get(EXPENSE_API_ENDPOINTS.CATEGORIES, { signal });
const convertedData = convertSnakeToCamel<ExpenseCategoryApiResponse>(response.data);
// response.data = {data: [...]}
// convertedData = {data: [...]} (正常)
```

### Phase 2 (デグレーション発生)
```typescript
const responseData = extractDataFromResponse(response, 'GetExpenseCategories');
// responseData = [...] (配列のみ)
const convertedData = convertSnakeToCamel<ExpenseCategoryApiResponse>(responseData);
// convertedData = [...] (配列のまま)
const result = convertedData.data.map(...) // ERROR!
```

## 修正方針

### 案1: getExpenseCategoriesの修正（推奨）
```typescript
export async function getExpenseCategories(signal?: AbortSignal): Promise<ExpenseCategory[]> {
  // ...
  const responseData = extractDataFromResponse(response, 'GetExpenseCategories');
  if (!responseData) {
    return [];
  }
  
  // responseDataが既に配列なので、直接マッピング
  if (Array.isArray(responseData)) {
    const convertedData = convertSnakeToCamel<Array<any>>(responseData);
    const result = convertedData.map(category => ({
      id: category.id,
      code: category.code,
      // ...
    }));
    return result;
  }
  
  // responseDataがオブジェクトの場合（後方互換性）
  const convertedData = convertSnakeToCamel<ExpenseCategoryApiResponse>(responseData);
  const result = convertedData.data.map(category => ({
    // ...
  }));
  return result;
}
```

### 案2: extractDataFromResponseの調整
APIによってレスポンス構造が異なるため、より柔軟な対応が必要かもしれません。

## 推奨アクション

1. **即座の修正**: `getExpenseCategories`関数を修正して配列を直接処理
2. **テスト追加**: カテゴリAPIのテストケースを追加
3. **他のAPI確認**: 同様の構造を持つ他のAPIの確認と修正
4. **ドキュメント化**: APIレスポンス構造の標準化ドキュメント作成

## 回避策
一時的な回避策として、Phase 2の修正を部分的にロールバックすることも可能です。

## 学習事項
- APIレスポンス構造の一貫性が重要
- 共通ユーティリティ導入時は、すべてのケースを考慮する必要がある
- 段階的な修正では、各段階でのテストが重要