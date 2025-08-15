'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import theme from '@/theme/theme';
import AuthErrorHandler from '@/components/common/AuthErrorHandler';
import { ToastProvider, GlobalErrorBoundary } from '@/components/common';
import { AuthProvider } from '@/context/AuthContext';
import { ActiveRoleProvider } from '@/context/ActiveRoleContext';
import { isMultiRoleEnabled } from '@/utils/roleUtils';
import { queryClient } from '@/lib/query-client';
import { QueryErrorBoundary } from '@/components/common/QueryErrorBoundary';

// Providerコンポーネント
export function Providers({ children }: { children: ReactNode }) {
  const multiRoleEnabled = isMultiRoleEnabled();

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <AuthErrorHandler />
            <AuthProvider>
              {/* Feature Flag: 複数ロールモードが有効な場合のみActiveRoleProviderを使用 */}
              {multiRoleEnabled ? (
                <ActiveRoleProvider>
                  <QueryErrorBoundary>
                    {children}
                  </QueryErrorBoundary>
                </ActiveRoleProvider>
              ) : (
                <QueryErrorBoundary>
                  {children}
                </QueryErrorBoundary>
              )}
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
