'use client';

import React from 'react';
import { Box, Container, CircularProgress, Typography } from '@mui/material';

export interface PageLoaderProps {
  message?: string;
  fullHeight?: boolean;
  containerMaxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

/**
 * ページ全体のローディング状態を表示する統一コンポーネント
 * Suspenseのfallbackや初期データ読み込み時に使用
 * 
 * @param message - 表示するローディングメッセージ（オプション）
 * @param fullHeight - 画面全体の高さを使用するかどうか（デフォルト: true）
 * @param containerMaxWidth - コンテナの最大幅（デフォルト: 'lg'）
 */
const PageLoader: React.FC<PageLoaderProps> = ({
  message,
  fullHeight = true,
  containerMaxWidth = 'lg',
}) => {
  return (
    <Container component="main" maxWidth={containerMaxWidth}>
      <Box
        sx={{
          minHeight: fullHeight ? '100vh' : 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: fullHeight ? 8 : 4,
        }}
      >
        <CircularProgress size={32} color="primary" />
        {message && (
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            {message}
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default PageLoader; 