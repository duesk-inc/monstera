// LocalStorage and SessionStorage keys for authentication
export const AUTH_STORAGE_KEYS = {
  USER: 'monstera_user',
  AUTH_STATE: 'monstera_auth_state',
  ACCESS_TOKEN: 'monstera_access_token',
  REFRESH_TOKEN: 'monstera_refresh_token',
  TOKEN_EXPIRY: 'monstera_token_expiry',
  REMEMBER_ME: 'monstera_remember_me',
} as const;

// Cache keys for API responses
export const CACHE_KEYS = {
  USER_PROFILE: 'cache_user_profile',
  NOTIFICATIONS: 'cache_notifications',
  WEEKLY_REPORTS: 'cache_weekly_reports',
} as const;

// Session keys
export const SESSION_KEYS = {
  REDIRECT_URL: 'session_redirect_url',
  LAST_ACTIVITY: 'session_last_activity',
} as const;

// Type exports
export type AuthStorageKeys = typeof AUTH_STORAGE_KEYS;
export type CacheKeys = typeof CACHE_KEYS;
export type SessionKeys = typeof SESSION_KEYS;