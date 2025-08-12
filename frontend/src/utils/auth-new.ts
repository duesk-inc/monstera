/**
 * 認証関連のユーティリティ（Cookie専用版）
 * LocalStorageを使用せず、サーバー側のCookieとAPIのみで認証状態を管理
 */

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

// デバッグモード
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// デバッグログ
const debugLog = (...args: unknown[]) => {
  if (DEBUG_MODE) {
    console.log('[Auth Utils]', ...args);
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
    4: 'engineer'
  };
  return roleMap[roleNumber] || 'engineer';
};

/**
 * APIから取得したユーザー情報をローカル用に変換
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
 * ユーザーが特定のロールを持っているかチェック
 */
export const hasRole = (user: User | null, role: string): boolean => {
  if (!user) return false;
  
  // 複数ロールがある場合はその中からチェック
  if (user.roles && user.roles.length > 0) {
    return user.roles.includes(role);
  }
  
  // 互換性のため単一ロールもチェック
  return user.role === role;
};

/**
 * ユーザーが管理者権限を持っているかチェック
 */
export const isAdmin = (user: User | null): boolean => {
  return hasRole(user, 'admin') || hasRole(user, 'super_admin');
};

/**
 * ユーザーがマネージャー権限を持っているかチェック
 */
export const isManager = (user: User | null): boolean => {
  return hasRole(user, 'manager') || isAdmin(user);
};

/**
 * ユーザーがエンジニア権限を持っているかチェック
 */
export const isEngineer = (user: User | null): boolean => {
  return hasRole(user, 'engineer');
};

// LocalStorage関連の関数は削除
// 認証状態の管理はサーバー側のセッションとHTTPOnly Cookieで行う