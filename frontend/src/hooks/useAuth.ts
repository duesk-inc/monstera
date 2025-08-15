/**
 * 認証フック
 * AuthContextへのエイリアス - 既存コンポーネントとの互換性を保つ
 * Phase 1: Feature Flagによる単一ロール/複数ロール切り替え対応
 */

import { useAuth as useAuthContext } from '@/context/AuthContext';
// Phase 4: ActiveRoleContextは削除済み
import { useCallback, useMemo } from 'react';
import { LoginRequest, User } from '@/types/auth';
// Phase 3: convertRoleNumberToString は不要になった
import { 
  hasPermission as hasPermissionUtil,
  isAdmin as isAdminUtil,
  isManager as isManagerUtil,
  roleStringToNumber 
} from '@/utils/roleUtils';

export const useAuth = () => {
  const authContext = useAuthContext();
  // Phase 4: Feature Flagは削除（常に単一ロールモード）

  // ログイン関数をラップして、ActiveRole初期化を含める
  const login = useCallback(async (credentials: LoginRequest) => {
    const result = await authContext.login(credentials);
    
    // Phase 4: ActiveRole初期化は削除
    
    return result;
  }, [authContext]);

  // 初期化関数（互換性のため）
  const initializeAuth = useCallback(() => {
    authContext.refreshAuth();
  }, [authContext]);

  // 単一ロールシステム用の権限チェック関数
  const currentUserRole = useMemo(() => {
    if (!authContext.user) return null;
    
    // Phase 4: 単一ロールシステムに統一
    return authContext.user.role;
  }, [authContext.user]);

  // 権限チェック関数（Feature Flagで切り替え）
  const hasPermission = useCallback((requiredRole: number): boolean => {
    if (!currentUserRole) return false;
    return hasPermissionUtil(currentUserRole, requiredRole);
  }, [currentUserRole]);

  const isAdmin = useCallback((): boolean => {
    if (!currentUserRole) return false;
    return isAdminUtil(currentUserRole);
  }, [currentUserRole]);

  const isManager = useCallback((): boolean => {
    if (!currentUserRole) return false;
    return isManagerUtil(currentUserRole);
  }, [currentUserRole]);

  // Phase 3: 単一ロール用のユーザー情報（User型を直接使用）
  const singleRoleUser: User | null = useMemo(() => {
    if (!authContext.user) return null;
    
    // Phase 3: User型はroleが数値に統一された
    return {
      ...authContext.user,
      role: currentUserRole || 4, // デフォルトはEngineer
    };
  }, [authContext.user, currentUserRole]);

  return {
    ...authContext,
    login,
    initializeAuth,
    // 単一ロールシステム用の拡張
    currentUserRole,
    singleRoleUser,
    hasPermission,
    isAdmin,
    isManager,
  };
};