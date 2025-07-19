'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { User } from '@/types/auth';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import theme from '@/theme/theme';
import AuthErrorHandler from '@/components/common/AuthErrorHandler';
import { ToastProvider, GlobalErrorBoundary } from '@/components/common';
import { ActiveRoleProvider } from '@/context/ActiveRoleContext';
import { queryClient } from '@/lib/query-client';
import { QueryErrorBoundary } from '@/components/common/QueryErrorBoundary';
import { CacheMonitor } from '@/components/dev/CacheMonitor';
import { useAuth } from '@/hooks/useAuth';

// 認証コンテキストの型定義（互換性のため維持）
interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
}

// コンテキスト作成（互換性のため維持）
const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isAuthenticated: false,
});

// AuthContextProviderコンポーネント（useAuthのラッパー）
function AuthContextProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  
  // setUserは実際には使用されないが、互換性のためダミー関数を提供
  const setUser = React.useCallback(() => {
    console.warn('setUser is deprecated. Use useAuth hook directly.');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Providerコンポーネント
export function Providers({ children }: { children: ReactNode }) {

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <AuthErrorHandler />
            <ActiveRoleProvider>
              <AuthContextProvider>
                <QueryErrorBoundary>
                  {children}
                </QueryErrorBoundary>
              </AuthContextProvider>
            </ActiveRoleProvider>
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
