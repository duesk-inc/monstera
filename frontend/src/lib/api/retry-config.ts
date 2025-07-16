import { ApiError } from '@/lib/api/admin';
import { HTTP_STATUS, RETRY_CONFIG } from '@/constants/network';

// リトライ可能なエラーかを判定
export const isRetryableError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) {
    return false;
  }

  // ネットワークエラーやタイムアウトはリトライ可能
  if (error.status === HTTP_STATUS.NETWORK_ERROR || error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return true;
  }

  // 5xx系のサーバーエラーはリトライ可能
  if (error.status >= HTTP_STATUS.SERVER_ERROR_RANGE_START && error.status < HTTP_STATUS.SERVER_ERROR_RANGE_END) {
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
  // 指数バックオフ with ジッター
  const exponentialDelay = RETRY_CONFIG.BASE_DELAY_MS * Math.pow(RETRY_CONFIG.EXPONENTIAL_BASE, attemptIndex);
  const jitter = Math.random() * RETRY_CONFIG.MAX_JITTER_MS;
  
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.MAX_DELAY_MS);
};

// React Query用のリトライ設定
export const queryRetryConfig = {
  retry: (failureCount: number, error: unknown) => {
    // 最大リトライ回数に達したら終了
    if (failureCount >= RETRY_CONFIG.MAX_RETRY_COUNT) {
      return false;
    }

    return isRetryableError(error);
  },
  retryDelay: calculateRetryDelay,
};