export const AUTH_COOKIES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export type AuthCookies = typeof AUTH_COOKIES;