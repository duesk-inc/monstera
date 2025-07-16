'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/auth';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import theme from '@/theme/theme';
import AuthErrorHandler from '@/components/common/AuthErrorHandler';
import { ToastProvider, GlobalErrorBoundary } from '@/components/common';
import { DebugLogger } from '@/lib/debug/logger';
import { ActiveRoleProvider } from '@/context/ActiveRoleContext';
import { queryClient } from '@/lib/query-client';
import { QueryErrorBoundary } from '@/components/common/QueryErrorBoundary';
import { CacheMonitor } from '@/components/dev/CacheMonitor';

// 認証コンテキストの型定義
interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
}

// コンテキスト作成
const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isAuthenticated: false,
});

// Providerコンポーネント
export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // 初期化時にローカルストレージからユーザー情報をロード
  useEffect(() => {
    const loadUserFromLocalStorage = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        DebugLogger.apiError({
          category: 'アプリ',
          operation: '初期化'
        }, {
          error
        });
      }
    };

    loadUserFromLocalStorage();
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <AuthErrorHandler />
            <AuthContext.Provider
              value={{
                user,
                setUser,
                isAuthenticated: !!user,
              }}
            >
              <ActiveRoleProvider>
                <QueryErrorBoundary>
                  {children}
                </QueryErrorBoundary>
              </ActiveRoleProvider>
            </AuthContext.Provider>
          </ToastProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
        <CacheMonitor />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

// カスタムフック
export function useAuthContext() {
  return useContext(AuthContext);
}
