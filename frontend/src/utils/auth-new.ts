/**
 * 認証関連のユーティリティ（Cookie専用版）
 * LocalStorageを使用せず、サーバー側のCookieとAPIのみで認証状態を管理
 */

// Phase 3: auth.tsのUser型を使用するため、この定義は削除

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
 * Phase 3: 単一ロールシステムでは変換不要のため、シンプルにパススルー
 */
export const convertToLocalUser = (user: any): any => {
  // Phase 3: 単一ロールシステムでは変換不要
  // APIからのデータをそのまま返す
  return user;
};

// Phase 3: 権限チェック関数はroleUtils.tsに移行済み
// 後方互換性のためのエイリアスとして残す

import { User } from '@/types/auth';
import { 
  isAdmin as isAdminUtil,
  isManager as isManagerUtil,
  roleStringToNumber 
} from '@/utils/roleUtils';

/**
 * @deprecated Use roleUtils.hasPermission instead
 */
export const hasRole = (user: User | null, role: string): boolean => {
  if (!user) return false;
  const roleNum = roleStringToNumber(role);
  return user.role === roleNum;
};

/**
 * @deprecated Use roleUtils.isAdmin instead
 */
export const isAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return isAdminUtil(user.role);
};

/**
 * @deprecated Use roleUtils.isManager instead
 */
export const isManager = (user: User | null): boolean => {
  if (!user) return false;
  return isManagerUtil(user.role);
};

/**
 * @deprecated Use roleUtils.isEngineer instead
 */
export const isEngineer = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 4; // Engineer = 4
};

// LocalStorage関連の関数は削除
// 認証状態の管理はサーバー側のセッションとHTTPOnly Cookieで行う