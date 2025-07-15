/**
 * ネットワーク関連の定数
 */

// API接続設定
export const API_CONFIG = {
  DEFAULT_PROTOCOL: 'http',
  DEFAULT_HOST: 'localhost',
  DEFAULT_PORT: 8080,
  BACKEND_SERVICE_NAME: 'backend',
} as const;

// HTTPステータスコード
export const HTTP_STATUS = {
  // 成功
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // クライアントエラー
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // サーバーエラー
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  
  // 特殊なケース
  NETWORK_ERROR: 0,
  SERVER_ERROR_RANGE_START: 500,
  SERVER_ERROR_RANGE_END: 600,
} as const;

// リトライ設定
export const RETRY_CONFIG = {
  BASE_DELAY_MS: 1000,        // 基本遅延時間（1秒）
  MAX_DELAY_MS: 30000,        // 最大遅延時間（30秒）
  MAX_JITTER_MS: 1000,        // ランダムジッター最大値（1秒）
  MAX_RETRY_COUNT: 3,         // 最大リトライ回数
  EXPONENTIAL_BASE: 2,        // 指数バックオフの基数
} as const;

// Note: タイムアウト設定は delays.ts に移動しました
// import { API_TIMEOUTS } from '@/constants/delays' を使用してください