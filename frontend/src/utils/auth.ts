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
 * クライアント側で認証状態を追跡するためのフラグ設定
 * @param isAuthenticated 認証状態
 * @param timestamp タイムスタンプ
 */
export const setAuthState = (isAuthenticated: boolean, timestamp?: number): void => {
  if (typeof window !== 'undefined') {
    const now = timestamp || Date.now();
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify({
      authenticated: isAuthenticated,
      timestamp: now,
      expires: now + TOKEN_EXPIRY
    }));
  }
};

/**
 * クライアント側の認証状態を取得
 * @returns 認証状態とタイムスタンプ
 */
export const getAuthState = (): { authenticated: boolean; timestamp: number; expires: number } | null => {
  if (typeof window !== 'undefined') {
    try {
      const state = localStorage.getItem(AUTH_STATE_KEY);
      if (state) {
        return JSON.parse(state);
      }
    } catch (e) {
      debugLog('認証状態解析エラー:', e);
    }
  }
  return null;
};

/**
 * クライアント側の認証状態をクリア
 */
export const clearAuthState = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STATE_KEY);
  }
};

/**
 * すべての認証関連データをクリア（完全なログアウト用）
 */
export const clearAllAuthData = (): void => {
  clearAuthState();
  removeUser();
  localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
  sessionStorage.removeItem('auth_state');
};

// ユーザー情報を保存
export const setUser = (user: User): void => {
  if (typeof window !== 'undefined') {
    try {
      // JSONに変換
      const userJson = JSON.stringify(user);
      
      // ローカルストレージに保存
      localStorage.setItem(USER_KEY, userJson);
    } catch (error) {
      debugLog('ユーザー情報の保存中にエラー:', error);
    }
  }
};

// ユーザー情報を取得
export const getUser = (): User | null => {
  if (typeof window !== 'undefined') {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      
      if (userStr) {
        try {
          const user = JSON.parse(userStr) as User;
          return user;
        } catch (error) {
          debugLog('ユーザー情報解析エラー:', error);
          return null;
        }
      }
    } catch (error) {
      debugLog('ユーザー情報取得中にエラー:', error);
    }
  }
  return null;
};

// ユーザー情報を削除
export const removeUser = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
  }
};

/**
 * 数値ロールを文字列ロールに変換
 */
export const convertRoleNumberToString = (roleNumber: number): string => {
  const roleMap: Record<number, string> = {
    1: 'super_admin',
    2: 'admin',
    3: 'manager',
    4: 'employee'
  };
  return roleMap[roleNumber] || 'employee';
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
  let roleString = 'employee';
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
 * トークンの有効期限をチェック
 * @returns トークンが有効かどうか
 */
export const isTokenValid = (): boolean => {
  const state = getAuthState();
  
  if (!state) {
    return false;
  }
  
  // 現在時刻と有効期限を比較
  return state.authenticated && Date.now() < state.expires;
};

// ログイン状態をチェック
export const isAuthenticated = (): boolean => {
  // トークンの有効期限をチェック
  if (!isTokenValid()) {
    // 有効期限切れの場合はfalseを返す
    return false;
  }
  
  // ユーザー情報が存在するかチェック
  return !!getUser();
};

// ログアウト処理
export const logout = (): void => {
  clearAllAuthData();
};

// アクセストークンを取得
export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

// ユーザーが特定のロールを持っているかチェック
export const hasRole = (role: string): boolean => {
  const user = getUser();
  if (!user) return false;
  
  // 複数ロールがある場合はその中からチェック
  if (user.roles && user.roles.length > 0) {
    return user.roles.includes(role);
  }
  
  // 互換性のため単一ロールもチェック
  return user.role === role;
};

// ユーザーが管理者権限を持っているかチェック
export const isAdmin = (): boolean => {
  return hasRole('admin') || hasRole('super_admin');
};

// ユーザーがマネージャー権限を持っているかチェック
export const isManager = (): boolean => {
  return hasRole('manager') || isAdmin();
};

// ユーザーがエンジニア権限を持っているかチェック
export const isEngineer = (): boolean => {
  return hasRole('employee') || hasRole('user');
}; 