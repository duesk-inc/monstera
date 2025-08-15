/**
 * 認証フック
 * AuthContextへのエイリアス - 既存コンポーネントとの互換性を保つ
 * Phase 1: Feature Flagによる単一ロール/複数ロール切り替え対応
 */

import { useAuth as useAuthContext } from '@/context/AuthContext';
import { useActiveRole } from '@/context/ActiveRoleContext';
import { useCallback, useMemo } from 'react';
import { LoginRequest, SingleRoleUser } from '@/types/auth';
import { convertRoleNumberToString } from '@/utils/auth-new';
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
    
    if (result.success && authContext.user) {
      // ActiveRoleProviderを初期化
      const userRoles = authContext.user.roles && authContext.user.roles.length > 0 
        ? authContext.user.roles 
        : [typeof authContext.user.role === 'string' 
            ? authContext.user.role 
            : convertRoleNumberToString(Number(authContext.user.role))];
      
      initializeActiveRole(userRoles, authContext.user.defaultRole);
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
      // 文字列の場合は変換
      return roleStringToNumber(authContext.user.role);
    } else {
      // 複数ロールモード: activeRoleを使用
      if (activeRole) {
        return roleStringToNumber(activeRole);
      }
      // フォールバック
      return roleStringToNumber(authContext.user.role);
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

  // 単一ロール用のユーザー情報を提供（段階的移行用）
  const singleRoleUser: SingleRoleUser | null = useMemo(() => {
    if (!authContext.user) return null;
    
    return {
      id: authContext.user.id,
      email: authContext.user.email,
      first_name: authContext.user.first_name,
      last_name: authContext.user.last_name,
      role: currentUserRole || 4, // デフォルトはEngineer
      phone_number: authContext.user.phone_number,
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