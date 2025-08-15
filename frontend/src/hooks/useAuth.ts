/**
 * 認証フック
 * AuthContextへのエイリアス - 既存コンポーネントとの互換性を保つ
 * Phase 1: Feature Flagによる単一ロール/複数ロール切り替え対応
 */

import { useAuth as useAuthContext } from '@/context/AuthContext';
import { useActiveRole } from '@/context/ActiveRoleContext';
import { useCallback, useMemo } from 'react';
import { LoginRequest, User } from '@/types/auth';
// Phase 3: convertRoleNumberToString は不要になった
import { 
  isMultiRoleEnabled, 
  hasPermission as hasPermissionUtil,
  isAdmin as isAdminUtil,
  isManager as isManagerUtil,
  roleStringToNumber 
} from '@/utils/roleUtils';

export const useAuth = () => {
  const authContext = useAuthContext();
  const { initializeActiveRole, activeRole } = useActiveRole();
  const multiRoleEnabled = isMultiRoleEnabled();

  // ログイン関数をラップして、ActiveRole初期化を含める
  const login = useCallback(async (credentials: LoginRequest) => {
    const result = await authContext.login(credentials);
    
    if (result.success && authContext.user && multiRoleEnabled) {
      // Phase 3: 複数ロールモードの場合のみActiveRoleProviderを初期化
      // 後方互換性のためrolesフィールドをチェック
      const userRoles = authContext.user.roles || [];
      initializeActiveRole(userRoles, authContext.user.default_role);
    }
    
    return result;
  }, [authContext, initializeActiveRole]);

  // 初期化関数（互換性のため）
  const initializeAuth = useCallback(() => {
    authContext.refreshAuth();
  }, [authContext]);

  // 単一ロールシステム用の権限チェック関数
  const currentUserRole = useMemo(() => {
    if (!authContext.user) return null;
    
    if (!multiRoleEnabled) {
      // 単一ロールモード: 数値のroleを直接使用
      if (typeof authContext.user.role === 'number') {
        return authContext.user.role;
      }
      // Phase 3: roleは数値に統一されたので変換不要
      return authContext.user.role;
    } else {
      // 複数ロールモード: activeRoleを使用
      if (activeRole) {
        return roleStringToNumber(activeRole);
      }
      // フォールバック
      return authContext.user.role;
    }
  }, [authContext.user, activeRole, multiRoleEnabled]);

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
    // Feature Flag
    multiRoleEnabled,
  };
};