# バグ調査レポート - 経費一覧画面のNETWORK_ERROR

## 実行日時
2025-08-20 11:36

## 問題の概要
経費一覧画面を表示した際に、ブラウザコンソールに`NETWORK_ERROR`（status: 500）が表示される。

## エラー詳細
```
エラー: {code: 'NETWORK_ERROR', message: 'ネットワークエラーが発生しました。接続を確認してください。', status: 500, details: {…}, timestamp: '2025-08-20T15:00:55.959Z'}
[エラー][EXPENSE_API] GetExpenseCategories: Failed to get expense categories
```

## 調査結果

### 1. 根本原因
**間欠的な認証エラーの誤った処理**

経費カテゴリ取得API (`/api/v1/expenses/categories`) の呼び出し時に、以下の問題が発生している：

1. **初回アクセス時（00:00:56）**: 正常に成功（HTTP 200）
2. **後続のアクセス時**: 認証トークンが正しく送信されない場合がある
3. **エラーハンドリングの問題**: 
   - バックエンドは401（Unauthorized）を返している
   - フロントエンドのエラーハンドラーが、特定条件下で401を500として誤って報告

### 2. 問題の発生メカニズム

#### バックエンド側の動作
```go
// backend/internal/handler/expense_handler.go:334
userID, ok := h.handlerUtil.GetAuthenticatedUserID(c)
if !ok {
    return  // 401エラーが返される
}
```

#### フロントエンド側の問題
```typescript
// frontend/src/lib/api/error/handler.ts:166-173
// その他のエラー
return createErrorResponse(
    ApiErrorCode.UNKNOWN_ERROR,
    error.message || '予期しないエラーが発生しました。',
    500,  // ← 常に500として処理
    {
        originalError: error,
    }
);
```

### 3. 影響範囲
- **影響を受ける機能**: 
  - 経費一覧画面の初期表示
  - 経費カテゴリドロップダウンの表示
  - 経費申請フォーム

- **影響を受けるユーザー**: 
  - 全ユーザー（間欠的に発生）

- **データ整合性への影響**: なし（読み取り専用の操作）

### 4. 問題パターンの特定

この問題は以下のパターンで発生する：
1. **認証トークンが空または無効な場合**
2. **APIクライアントが正しく初期化されていない場合**
3. **Axiosのレスポンスが予期しない形式の場合**

### 5. 類似の過去の問題
- `expense_api_property_mismatch_issue` - プロパティ名の不整合によるエラー
- `api_client_migration_pattern` - APIクライアントの移行パターン

## 修正方針

### 短期的な修正
1. エラーハンドリングの改善
   - 401エラーを正しく処理
   - NETWORK_ERRORと実際のHTTPエラーを区別

### 長期的な改善
1. APIクライアントの初期化タイミングの見直し
2. 認証トークンの管理方法の改善
3. エラーログの詳細化

## 技術的詳細

### 関連ファイル
- `frontend/src/lib/api/expense.ts:655` - getExpenseCategories関数
- `frontend/src/lib/api/error/handler.ts:101-174` - convertToStandardError
- `backend/internal/handler/expense_handler.go:329-364` - GetCategories
- `frontend/src/hooks/expense/useCategories.ts:73` - React Query フック

### 修正箇所
1. **frontend/src/lib/api/error/handler.ts**
   - `convertToStandardError`メソッドで、Axiosエラーの処理を改善
   - responseがない場合の処理を見直し

2. **frontend/src/lib/api/expense.ts**
   - getExpenseCategories関数のエラーハンドリング強化
   - 認証エラーの明示的な処理追加

## 推奨される次のステップ
1. `/bug-fix` コマンドで修正実装
2. エラーハンドリングのユニットテスト追加
3. 認証フローの統合テスト強化

## 備考
- エラーは間欠的に発生するため、再現条件の特定が重要
- 開発環境での認証トークン管理に問題がある可能性
- フロントエンドのエラーハンドリングロジックの全体的な見直しが必要