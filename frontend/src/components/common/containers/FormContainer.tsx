import React from 'react';
import {
  Paper,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';

export interface FormContainerProps {
  /** フォームのタイトル */
  title?: string;
  /** サブタイトルまたは説明 */
  subtitle?: string;
  /** フォームの子要素 */
  children: React.ReactNode;
  /** ローディング状態 */
  loading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** コンテナのバリアント */
  variant?: 'default' | 'outlined' | 'elevated';
  /** パディングサイズ */
  padding?: 'small' | 'medium' | 'large';
  /** margin bottom */
  marginBottom?: number;
  /** テストID */
  'data-testid'?: string;
}

/**
 * フォーム用統一コンテナコンポーネント
 * 
 * 既存のPaperベースフォームコンテナを統一化し、
 * 一貫したスタイリングとUXを提供します。
 * 
 * 既存機能との完全な後方互換性を保証します。
 */
export const FormContainer: React.FC<FormContainerProps> = ({
  title,
  subtitle,
  children,
  loading = false,
  error = null,
  variant = 'default',
  padding = 'medium',
  marginBottom = 4,
  'data-testid': testId,
}) => {
  // パディング値の決定
  const getPaddingValue = () => {
    switch (padding) {
      case 'small': return 2;
      case 'large': return 4;
      case 'medium':
      default: return 3;
    }
  };

  // バリアント別のスタイル決定
  const getElevation = () => {
    switch (variant) {
      case 'elevated': return 3;
      case 'outlined': return 0;
      case 'default':
      default: return 1;
    }
  };

  const getBorderStyle = () => {
    if (variant === 'outlined') {
      return {
        border: '1px solid',
        borderColor: 'divider',
      };
    }
    return {};
  };

  const getBoxShadow = () => {
    if (variant === 'elevated') {
      return '0 4px 20px rgba(0,0,0,0.05)';
    }
    return undefined;
  };

  const paddingValue = getPaddingValue();

  return (
    <Paper 
      elevation={getElevation()}
      sx={{
        borderRadius: 2,
        mb: marginBottom,
        ...getBorderStyle(),
        ...(getBoxShadow() && { boxShadow: getBoxShadow() }),
      }}
      data-testid={testId}
    >
      <Box sx={{ p: paddingValue }}>
        {/* ヘッダー部分（タイトル・サブタイトル） */}
        {(title || subtitle) && (
          <Box sx={{ mb: 3 }}>
            {title && (
              <Typography 
                variant="h4" 
                component="h1" 
                fontWeight="bold" 
                sx={{ mb: subtitle ? 1 : 0 }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body1" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        )}

        {/* エラー表示 */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: 1 }}
          >
            {error}
          </Alert>
        )}

        {/* ローディング状態 */}
        {loading ? (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            minHeight={200}
          >
            <CircularProgress />
          </Box>
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
}; 