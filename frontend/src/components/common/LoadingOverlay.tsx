'use client';

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  position?: 'fixed' | 'absolute';
  backgroundColor?: string;
  zIndex?: number;
}

/**
 * オーバーレイ式のローディング状態を表示する統一コンポーネント
 * フォーム送信中や全画面処理中など、モーダル的なローディングに使用
 * 
 * @param open - オーバーレイの表示状態
 * @param message - 表示するローディングメッセージ（オプション）
 * @param size - ローディングアイコンのサイズ（デフォルト: 'large'）
 * @param position - ポジション指定（デフォルト: 'fixed'）
 * @param backgroundColor - 背景色（デフォルト: 'rgba(0, 0, 0, 0.5)'）
 * @param zIndex - z-index値（デフォルト: 9999）
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message,
  size = 'large',
  position = 'fixed',
  backgroundColor = 'rgba(0, 0, 0, 0.5)',
  zIndex = 9999,
}) => {
  const getCircularProgressSize = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'medium':
        return 32;
      case 'large':
        return 40;
      default:
        return 32;
    }
  };

  const getTypographyVariant = () => {
    switch (size) {
      case 'small':
        return 'body1' as const;
      case 'medium':
        return 'h6' as const;
      case 'large':
        return 'h5' as const;
      default:
        return 'h6' as const;
    }
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex,
      }}
    >
      <CircularProgress size={getCircularProgressSize()} color="primary" />
      {message && (
        <Typography
          variant={getTypographyVariant()}
          sx={{
            mt: 2,
            color: 'white',
            textAlign: 'center',
            fontWeight: 'medium',
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingOverlay; 