/**
 * ローカルストレージ・セッションストレージのキー定数
 */

// 認証関連
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  USER_ID: 'userId',
  LAST_LOGIN: 'lastLogin',
  REMEMBER_ME: 'rememberMe',
  AUTH_ERROR_PAGE: 'auth_error_from_page',
  LAST_AUTH_ERROR_TIME: 'last_auth_error_time',
} as const;

// アプリケーション設定
export const APP_STORAGE_KEYS = {
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  PREFERRED_VIEW: 'preferredView',
} as const;

// フォーム関連
export const FORM_STORAGE_KEYS = {
  DRAFT_PREFIX: 'draft_',
  FORM_STATE: 'formState',
  LAST_SAVED: 'lastSaved',
} as const;

// 開発者向け
export const DEV_STORAGE_KEYS = {
  DEBUG_MODE: 'debugMode',
  API_MOCK: 'apiMock',
  FEATURE_FLAGS: 'featureFlags',
} as const;

// セッション関連
export const SESSION_STORAGE_KEYS = {
  REDIRECT_URL: 'redirectUrl',
  SESSION_ID: 'sessionId',
  TAB_ID: 'tabId',
} as const;

// 全てのストレージキーをエクスポート
export const STORAGE_KEYS = {
  ...AUTH_STORAGE_KEYS,
  ...APP_STORAGE_KEYS,
  ...FORM_STORAGE_KEYS,
  ...DEV_STORAGE_KEYS,
  ...SESSION_STORAGE_KEYS,
} as const;

// ストレージ操作のヘルパー型
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];