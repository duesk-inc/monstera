'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import theme from '@/theme/theme';
import AuthErrorHandler from '@/components/common/AuthErrorHandler';
import { ToastProvider, GlobalErrorBoundary } from '@/components/common';
import { AuthProvider } from '@/context/AuthContext';
// Phase 4: ActiveRoleProviderとFeature Flagは削除
import { queryClient } from '@/lib/query-client';
import { QueryErrorBoundary } from '@/components/common/QueryErrorBoundary';

// Providerコンポーネント
export function Providers({ children }: { children: ReactNode }) {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <AuthErrorHandler />
            <AuthProvider>
              <QueryErrorBoundary>
                {children}
              </QueryErrorBoundary>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
