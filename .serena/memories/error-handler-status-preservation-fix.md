# エラーハンドラーステータスコード保持修正パターン

## 作成日
2025-08-21

## 修正実施日
2025-08-21

## 問題
エラーハンドラーの「その他のエラー」処理で常に500を返していたため、401などの実際のHTTPステータスコードが失われていた。

## 修正実装
```typescript
// 修正前
return createErrorResponse(
  ApiErrorCode.UNKNOWN_ERROR,
  error.message || '予期しないエラーが発生しました。',
  500,  // 常に500を返す
  { originalError: error }
);

// 修正後
const statusCode = error.response?.status || 0;
const errorCode = statusCode > 0 ? getErrorCodeFromStatus(statusCode) : ApiErrorCode.UNKNOWN_ERROR;

return createErrorResponse(
  errorCode,
  error.message || '予期しないエラーが発生しました。',
  statusCode || 500,  // ステータスコードがない場合のみ500
  {
    originalError: error,
    url: error.config?.url,
  }
);
```

## 成功ポイント
1. 元のHTTPステータスコードを保持
2. 適切なエラーコードへのマッピング
3. ステータスコードがない場合のフォールバック処理
4. 追加情報（URL）の保存

## テストケース
- 401, 403, 404, 500エラーの個別テスト
- 各エラーでステータスコードとエラーコードの一致を確認

## 教訓
- エラーハンドラーでは常に元の情報を保持する
- デフォルトケースでの固定値返却を避ける
- 十分なテストケースで各パターンを確認