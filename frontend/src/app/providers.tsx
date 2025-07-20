'use client';

import React, { ReactNode } from 'react';
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
              <QueryErrorBoundary>
                {children}
              </QueryErrorBoundary>
            </ActiveRoleProvider>
          </ToastProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
        <CacheMonitor />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
