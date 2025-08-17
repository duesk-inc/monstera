# 統一エラーハンドリングパターン

## 概要
Phase 4-3で実装した、標準化されたAPIエラーハンドリングシステム。
すべてのAPIエラーを一貫した形式で処理し、開発効率と保守性を向上。

## 実装場所
- `/lib/api/types/error.ts` - エラー型定義
- `/lib/api/error/handler.ts` - グローバルハンドラー
- `/lib/api/factory/interceptors.ts` - インターセプター統合

## 主要コンポーネント

### 1. StandardErrorResponse型
```typescript
interface StandardErrorResponse {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: ErrorDetails;
  };
  status: number;
  timestamp: string;
}
```

### 2. GlobalApiErrorHandler
- シングルトンパターン
- AxiosError → StandardErrorResponse変換
- エラー頻度追跡
- カスタムイベント発火

### 3. エラーハンドリングオプション
```typescript
interface ErrorHandlingOptions {
  showNotification?: boolean;
  logError?: boolean;
  throwError?: boolean;
  customHandler?: Function;
  retryable?: boolean;
  silent?: boolean;
}
```

## 使用方法
```typescript
// 基本的な使用
try {
  const response = await apiCall();
} catch (error: any) {
  const standardError = handleApiError(error, {
    showNotification: true,
    logError: true,
    throwError: false,
  });
  throw standardError;
}

// サイレント処理
handleApiErrorSilently(error);

// リトライ可能処理
handleRetryableApiError(error, () => retry());
```

## 利点
1. **一貫性**: すべてのエラーが標準形式
2. **型安全性**: TypeScriptによる完全な型サポート
3. **自動変換**: AxiosErrorから自動変換
4. **エラー追跡**: 頻発エラーの自動検出
5. **UI通知**: カスタムイベントによる柔軟な通知

## 成功パターン
- エラーコード体系の明確な定義
- HTTPステータスコードからの自動マッピング
- 重複処理防止機構の実装
- 段階的な移行戦略（既存コードとの共存）