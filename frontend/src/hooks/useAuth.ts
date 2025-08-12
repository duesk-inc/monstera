/**
 * 認証フック
 * AuthContextへのエイリアス - 既存コンポーネントとの互換性を保つ
 */

import { useAuth as useAuthContext } from '@/context/AuthContext';
import { useActiveRole } from '@/context/ActiveRoleContext';
import { useCallback } from 'react';
import { LoginRequest } from '@/types/auth';
import { convertRoleNumberToString } from '@/utils/auth-new';

export const useAuth = () => {
  const authContext = useAuthContext();
  const { initializeActiveRole } = useActiveRole();

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

  return {
    ...authContext,
    login,
    initializeAuth,
  };
};