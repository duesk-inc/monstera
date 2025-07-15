/**
 * 認証関連の定数
 */

// トークン有効期限
export const AUTH_TOKEN_EXPIRY = {
  ACCESS_TOKEN_MINUTES: 15,       // アクセストークン有効期限（15分）
  REFRESH_TOKEN_DAYS: 7,          // リフレッシュトークン有効期限（7日間）
} as const;

// 認証クッキー名
export const AUTH_COOKIES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// Note: ストレージキーは storage.ts に移動しました
// import { AUTH_STORAGE_KEYS } from '@/constants/storage' を使用してください

// 認証エラーコード
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'AUTH001',
  TOKEN_EXPIRED: 'AUTH002',
  TOKEN_INVALID: 'AUTH003',
  REFRESH_FAILED: 'AUTH004',
  UNAUTHORIZED: 'AUTH005',
} as const;

// セッション設定
export const SESSION_CONFIG = {
  IDLE_TIMEOUT_MINUTES: 30,       // アイドルタイムアウト（30分）
  WARNING_BEFORE_MINUTES: 5,      // タイムアウト警告表示（5分前）
} as const;