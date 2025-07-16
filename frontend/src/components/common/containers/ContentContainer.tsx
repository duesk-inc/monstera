import React from 'react';
import {
  Paper,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';

export interface ContentContainerProps {
  /** コンテンツのタイトル */
  title?: string;
  /** サブタイトルまたは説明 */
  subtitle?: string;
  /** コンテンツの子要素 */
  children: React.ReactNode;
  /** ローディング状態 */
  loading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** コンテナのバリアント */
  variant?: 'default' | 'minimal' | 'elevated';
  /** スペーシング */
  spacing?: 'compact' | 'normal' | 'comfortable';
  /** margin bottom */
  marginBottom?: number;
  /** テストID */
  'data-testid'?: string;
}

/**
 * コンテンツエリア用統一コンテナコンポーネント
 * 
 * 既存のPaperベースコンテンツコンテナを統一化し、
 * 一貫したスタイリングとUXを提供します。
 * 
 * 既存機能との完全な後方互換性を保証します。
 */
export const ContentContainer: React.FC<ContentContainerProps> = ({
  title,
  subtitle,
  children,
  loading = false,
  error = null,
  variant = 'default',
  spacing = 'normal',
  marginBottom = 3,
  'data-testid': testId,
}) => {
  // スペーシング値の決定
  const getPaddingValue = () => {
    switch (spacing) {
      case 'compact': return 2;
      case 'comfortable': return 4;
      case 'normal':
      default: return 3;
    }
  };

  // バリアント別のスタイル決定
  const getElevation = () => {
    switch (variant) {
      case 'elevated': return 2;
      case 'minimal': return 0;
      case 'default':
      default: return 1;
    }
  };

  const getBoxShadow = () => {
    switch (variant) {
      case 'elevated': return '0 4px 20px rgba(0,0,0,0.05)';
      case 'minimal': return 'none';
      case 'default':
      default: return undefined; // テーマのデフォルトを使用
    }
  };

  const getBorderStyle = () => {
    if (variant === 'minimal') {
      return {
        border: 'none',
        bgcolor: 'transparent',
      };
    }
    return {};
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
                variant="h5" 
                component="h2" 
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
            minHeight={150}
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