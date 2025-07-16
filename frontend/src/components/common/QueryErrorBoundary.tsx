'use client';

import React from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Box, Button, Typography, Paper, Container } from '@mui/material';
import { Refresh as RefreshIcon, ErrorOutline as ErrorOutlineIcon } from '@mui/icons-material';
import { ApiError } from '@/lib/api/admin';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const isApiError = error instanceof ApiError;
  const is404 = isApiError && error.status === 404;
  const is500 = isApiError && error.status >= 500;

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 8, textAlign: 'center' }}>
        <ErrorOutlineIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        
        <Typography variant="h5" gutterBottom>
          {is404 ? 'ページが見つかりません' : 
           is500 ? 'サーバーエラーが発生しました' : 
           'エラーが発生しました'}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {isApiError ? error.message : 
           '申し訳ございません。問題が発生しました。'}
        </Typography>

        {!is404 && (
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={resetErrorBoundary}
          >
            再試行
          </Button>
        )}
      </Paper>
    </Container>
  );
}

export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={reset}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}