# 経費一覧表示NETWORK_ERROR調査結果

## 調査日時
2025年1月20日 11:30

## エラー内容
経費申請後、経費一覧画面に戻る際にブラウザコンソールで`NETWORK_ERROR`が表示される。

### ブラウザエラーログ
```javascript
{
  "name": "AxiosError",
  "message": "Request failed with status code 500",
  "stack": "AxiosError: Request failed with status code 500\n    at Wl (http://localhost:3000/_next/static/chunks/1947-03c0e48c8e1e8f13.js:2:8436)",
  "config": {
    "url": "/api/v1/expenses?page=1&limit=20&startDate=2024-08-20&endDate=2025-08-20",
    "method": "get",
    "baseURL": "http://localhost:8080"
  },
  "code": "ERR_BAD_RESPONSE",
  "status": 500
}
```

## 調査結果

### 1. バックエンドの状況
- **エンドポイント**: `/api/v1/expenses` (GET)
- **ハンドラー**: `ExpenseHandler.GetExpenseList`
- **実際のレスポンス**: ステータス200で正常にレスポンス返却
- **ログ確認**: バックエンドログにエラーなし

```
2025-08-20T16:57:17.202+0900 INFO HTTP Request
{"method": "GET", "path": "/api/v1/expenses?page=1&limit=20&startDate=2024-08-20&endDate=2025-08-20", "status": 200, "latency": "17.621375ms"}
```

### 2. フロントエンドの実装
- **APIクライアント**: 仕様準拠（`createPresetApiClient('auth')`使用）
- **エラーハンドリング**: `handleApiError`使用で正しく実装
- **データマッパー**: `mapBackendExpenseListToExpenseList`関数

### 3. 問題の特定

#### 矛盾点
1. バックエンドは200ステータスで成功レスポンスを返している
2. フロントエンドは500エラーとして認識している

#### 推定原因
フロントエンドのデータマッピング処理でエラーが発生している可能性が高い。

```typescript
// frontend/src/lib/api/expense.ts (line 169)
const result = mapBackendExpenseListToExpenseList(response.data.data);

// frontend/src/utils/expenseMappers.ts (line 50-52)
export function mapBackendExpenseListToExpenseList(backendResponse: ExpenseListBackendResponse): ExpenseListResponse {
  return {
    items: backendResponse.items.map(mapBackendExpenseToExpenseData),
    // ...
  };
}
```

### 4. 考えられる問題

1. **レスポンス構造の不整合**
   - `response.data.data`がundefinedまたはnull
   - `items`プロパティが存在しない
   - `items`配列内のデータ構造が期待と異なる

2. **マッピング関数のエラー**
   - `mapBackendExpenseToExpenseData`関数内でのエラー
   - 必須フィールドの欠落
   - 型変換エラー

## 推奨対応

### 1. デバッグログの追加
```typescript
try {
  const client = createPresetApiClient('auth');
  const response = await client.get(EXPENSE_API_ENDPOINTS.EXPENSES, { params, signal });
  
  // デバッグログ追加
  console.log('Response data:', response.data);
  console.log('Response data.data:', response.data?.data);
  
  // nullチェック追加
  if (!response.data?.data) {
    throw new Error('Invalid response format: missing data field');
  }
  
  const result = mapBackendExpenseListToExpenseList(response.data.data);
  // ...
} catch (error) {
  // ...
}
```

### 2. マッパー関数の安全性向上
```typescript
export function mapBackendExpenseListToExpenseList(backendResponse: ExpenseListBackendResponse): ExpenseListResponse {
  // nullチェックとデフォルト値
  if (!backendResponse || !backendResponse.items) {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
  }
  
  return {
    items: backendResponse.items.map(mapBackendExpenseToExpenseData),
    // ...
  };
}
```

### 3. エラーハンドリングの改善
- マッピングエラーを適切にキャッチ
- より詳細なエラーメッセージの提供
- フォールバック処理の実装

## 次のステップ
1. レスポンスデータの実際の構造を確認
2. マッパー関数にnullチェックとエラーハンドリングを追加
3. デバッグログで問題箇所を特定
4. 修正後の動作確認