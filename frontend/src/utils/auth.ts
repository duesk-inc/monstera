import { AUTH_STORAGE_KEYS } from '@/constants/storage';

// ユーザー基本情報の型
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;         // 互換性のため残す（最高権限のロール）
  roles?: string[];     // 複数ロール対応
  defaultRole?: number; // デフォルトロール（1:super_admin, 2:admin, 3:manager, 4:employee）
  phoneNumber?: string;
}

// ローカルストレージのキー
const USER_KEY = 'monstera_user';
const AUTH_STATE_KEY = 'monstera_auth_state';

// トークンの有効期限（15分 = 900000ミリ秒）
const TOKEN_EXPIRY = 15 * 60 * 1000;

// デバッグモード
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// デバッグログ
const debugLog = (...args: unknown[]) => {
  if (DEBUG_MODE) {
    console.log('[Auth Utils]', ...args);
  }
};

/**
 * @deprecated Cookie認証に移行中。この関数は使用しないでください。
 */
export const setAuthState = (isAuthenticated: boolean, timestamp?: number): void => {
  debugLog('[DEPRECATED] setAuthState called - localStorage usage is being phased out');
};

/**
 * @deprecated Cookie認証に移行中。この関数は使用しないでください。
 */
export const getAuthState = (): { authenticated: boolean; timestamp: number; expires: number } | null => {
  debugLog('[DEPRECATED] getAuthState called - localStorage usage is being phased out');
  return null;
};

/**
 * @deprecated Cookie認証に移行中。この関数は使用しないでください。
 */
export const clearAuthState = (): void => {
  debugLog('[DEPRECATED] clearAuthState called - localStorage usage is being phased out');
};

/**
 * @deprecated Cookie認証に移行中。この関数は使用しないでください。
 */
export const clearAllAuthData = (): void => {
  debugLog('[DEPRECATED] clearAllAuthData called - localStorage usage is being phased out');
};

/**
 * @deprecated Cookie認証に移行中。この関数は使用しないでください。
 */
export const setUser = (user: User): void => {
  debugLog('[DEPRECATED] setUser called - localStorage usage is being phased out');
};

/**
 * @deprecated Cookie認証に移行中。この関数は使用しないでください。
 */
export const getUser = (): User | null => {
  debugLog('[DEPRECATED] getUser called - localStorage usage is being phased out');
  return null;
};

/**
 * @deprecated Cookie認証に移行中。この関数は使用しないでください。
 */
export const removeUser = (): void => {
  debugLog('[DEPRECATED] removeUser called - localStorage usage is being phased out');
};

/**
 * 数値ロールを文字列ロールに変換
 */
export const convertRoleNumberToString = (roleNumber: number): string => {
  const roleMap: Record<number, string> = {
    1: 'super_admin',
    2: 'admin',
    3: 'manager',
    4: 'engineer'
  };
  return roleMap[roleNumber] || 'engineer';
};

/**
 * APIから取得したユーザー情報をローカルストレージ用に変換
 */
export const convertToLocalUser = (user: { 
  id: string; 
  email: string; 
  first_name?: string | null; 
  last_name?: string | null; 
  role?: string | number;
  roles?: (string | number)[];
  default_role?: number;
  phone_number?: string | null;
}): User => {
  // roleを文字列に変換
  let roleString = 'engineer';
  if (user.role) {
    roleString = typeof user.role === 'number' 
      ? convertRoleNumberToString(user.role) 
      : user.role;
  }

  // rolesを文字列配列に変換
  let rolesArray: string[] = [roleString];
  if (user.roles && Array.isArray(user.roles)) {
    rolesArray = user.roles.map(r => 
      typeof r === 'number' ? convertRoleNumberToString(r) : r
    );
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    role: roleString,
    roles: rolesArray,
    defaultRole: user.default_role,
    phoneNumber: user.phone_number || ''
  };
};

/**
 * @deprecated Cookie認証に移行中。サーバー側で検証されます。
 */
export const isTokenValid = (): boolean => {
  debugLog('[DEPRECATED] isTokenValid called - Token validation is handled server-side');
  return false;
};

/**
 * @deprecated Cookie認証に移行中。認証状態はContext経由で取得してください。
 */
export const isAuthenticated = (): boolean => {
  debugLog('[DEPRECATED] isAuthenticated called - Use AuthContext instead');
  return false;
};

/**
 * @deprecated Cookie認証に移行中。AuthContextのlogout関数を使用してください。
 */
export const logout = (): void => {
  debugLog('[DEPRECATED] logout called - Use AuthContext.logout() instead');
};

/**
 * @deprecated Cookie認証に移行中。トークンはHTTPOnly Cookieで管理されます。
 */
export const getAccessToken = (): string | null => {
  debugLog('[DEPRECATED] getAccessToken called - Tokens are managed in HTTPOnly cookies');
  return null;
};

/**
 * @deprecated Cookie認証に移行中。AuthContext経由でユーザー情報を取得してください。
 */
export const hasRole = (role: string): boolean => {
  debugLog('[DEPRECATED] hasRole called - Use AuthContext to get user information');
  return false;
};

/**
 * @deprecated Cookie認証に移行中。AuthContext経由でユーザー情報を取得してください。
 */
export const isAdmin = (): boolean => {
  debugLog('[DEPRECATED] isAdmin called - Use AuthContext to get user information');
  return false;
};

/**
 * @deprecated Cookie認証に移行中。AuthContext経由でユーザー情報を取得してください。
 */
export const isManager = (): boolean => {
  debugLog('[DEPRECATED] isManager called - Use AuthContext to get user information');
  return false;
};

/**
 * @deprecated Cookie認証に移行中。AuthContext経由でユーザー情報を取得してください。
 */
export const isEngineer = (): boolean => {
  debugLog('[DEPRECATED] isEngineer called - Use AuthContext to get user information');
  return false;
}; 