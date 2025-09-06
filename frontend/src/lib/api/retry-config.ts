import { ApiError } from '@/lib/api/admin';
import { HTTP_STATUS, RETRY_CONFIG } from '@/constants/network';

// リトライ可能なエラーかを判定
export const isRetryableError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) {
    return false;
  }

  // ネットワークエラーやタイムアウトはリトライ可能（コードで判定）
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return true;
  }

  // 5xx系のサーバーエラーはリトライ可能
  if (typeof error.status === 'number' && error.status >= 500 && error.status < 600) {
    return true;
  }

  // 429 Too Many Requestsはリトライ可能
  if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return true;
  }

  // その他のエラーはリトライしない
  return false;
};

// リトライ間隔を計算（指数バックオフ）
export const calculateRetryDelay = (attemptIndex: number): number => {
  // 指数バックオフ（定義済みのBASE_DELAYとBACKOFF_MULTIPLIERを使用）
  const exponentialDelay = RETRY_CONFIG.BASE_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attemptIndex);
  return Math.min(exponentialDelay, RETRY_CONFIG.MAX_DELAY);
};

// React Query用のリトライ設定
export const queryRetryConfig = {
  retry: (failureCount: number, error: unknown) => {
    // 最大リトライ回数に達したら終了
    if (failureCount >= RETRY_CONFIG.MAX_ATTEMPTS) {
      return false;
    }

    return isRetryableError(error);
  },
  retryDelay: calculateRetryDelay,
};
