'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, convertToLocalUser } from '@/utils/auth-new';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '@/lib/api/auth';
import { LoginRequest } from '@/types/auth';
import { DebugLogger } from '@/lib/debug/logger';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; redirectTo?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEBUG_MODE = process.env.NODE_ENV === 'development';

const debugLog = (...args: unknown[]) => {
  if (DEBUG_MODE) {
    DebugLogger.info({
      category: '認証',
      operation: 'ログ'
    }, args.join(' '));
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // 認証状態を確認する関数
  const refreshAuth = useCallback(async () => {
    try {
      debugLog('認証状態を確認中...');
      const response = await getCurrentUser();
      
      if (response && response.user) {
        const localUser = convertToLocalUser(response.user);
        setUser(localUser);
        setIsAuthenticated(true);
        debugLog('認証状態確認成功:', localUser.email);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        debugLog('認証されていません');
      }
    } catch (err) {
      debugLog('認証状態確認エラー:', err);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回マウント時に認証状態を確認
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // ログイン関数
  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      debugLog('ログインリクエスト送信:', credentials.email);
      const response = await apiLogin(credentials);
      
      if (response && response.user) {
        const localUser = convertToLocalUser(response.user);
        setUser(localUser);
        setIsAuthenticated(true);
        debugLog('ログイン成功:', response.user.email);
        
        return { 
          success: true, 
          redirectTo: response.redirect_to 
        };
      }
      
      throw new Error('ログインレスポンスが不正です');
    } catch (err) {
      DebugLogger.apiError({
        category: '認証',
        operation: 'ログイン'
      }, {
        error: err
      });
      
      const errorMessage = err && typeof err === 'object' && 'error' in err
        ? String(err.error)
        : 'サーバーエラーが発生しました';
      
      setError(errorMessage);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ログアウト関数
  const logout = useCallback(async () => {
    setIsLoading(true);
    debugLog('ログアウト処理を開始します');
    
    try {
      await apiLogout();
      debugLog('ログアウトリクエスト成功');
    } catch (err) {
      DebugLogger.apiError({
        category: '認証',
        operation: 'ログアウト'
      }, {
        error: err
      });
    } finally {
      // エラーが発生してもクライアント側の状態をクリア
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      
      // ログインページにリダイレクト
      router.push('/login?force=true');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isAuthenticated,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};