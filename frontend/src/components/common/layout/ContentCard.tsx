'use client';

import React from 'react';
import { Paper, Box, Typography, SxProps, Theme } from '@mui/material';

export interface ContentCardProps {
  /** カードの子要素 */
  children: React.ReactNode;
  /** カードタイトル */
  title?: string;
  /** サブタイトルまたは説明 */
  subtitle?: string;
  /** ヘッダー部分のアクション要素 */
  actions?: React.ReactNode;
  /** カードのバリアント */
  variant?: 'default' | 'elevated' | 'outlined' | 'minimal';
  /** パディングサイズ */
  padding?: 'compact' | 'normal' | 'comfortable';
  /** カードの高さ */
  height?: string | number;
  /** 追加のスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * コンテンツカードコンポーネント
 * 統一されたカードレイアウトとスタイリングを提供
 * 
 * @param children - カードの子要素
 * @param title - カードタイトル
 * @param subtitle - サブタイトルまたは説明
 * @param actions - ヘッダー部分のアクション要素
 * @param variant - カードのバリアント（デフォルト: 'default'）
 * @param padding - パディングサイズ（デフォルト: 'normal'）
 * @param height - カードの高さ
 * @param sx - 追加のスタイル
 * @param data-testid - テストID
 */
export const ContentCard: React.FC<ContentCardProps> = ({
  children,
  title,
  subtitle,
  actions,
  variant = 'default',
  padding = 'normal',
  height,
  sx,
  'data-testid': testId,
}) => {
  // バリアントに応じたスタイル
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          borderRadius: 2,
          border: 'none',
        };
      case 'outlined':
        return {
          boxShadow: 'none',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        };
      case 'minimal':
        return {
          boxShadow: 'none',
          borderRadius: 2,
          border: 'none',
          backgroundColor: 'transparent',
        };
      case 'default':
      default:
        return {
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.04)',
        };
    }
  };

  // パディングサイズ
  const getPaddingValue = () => {
    switch (padding) {
      case 'compact':
        return 2;
      case 'comfortable':
        return 4;
      case 'normal':
      default:
        return 3;
    }
  };

  const paddingValue = getPaddingValue();

  return (
    <Paper
      sx={{
        ...getVariantStyles(),
        ...(height && { height }),
        ...sx,
      }}
      data-testid={testId}
    >
      <Box sx={{ p: paddingValue }}>
        {/* ヘッダー部分（タイトル・サブタイトル・アクション） */}
        {(title || subtitle || actions) && (
          <Box sx={{ mb: title || subtitle ? 3 : 2 }}>
            {/* タイトル行 */}
            {(title || actions) && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: subtitle ? 1 : 0,
                }}
              >
                {title && (
                  <Typography
                    variant="h6"
                    component="h2"
                    fontWeight="bold"
                    sx={{ flexGrow: 1 }}
                  >
                    {title}
                  </Typography>
                )}
                
                {actions && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexShrink: 0,
                    }}
                  >
                    {actions}
                  </Box>
                )}
              </Box>
            )}

            {/* サブタイトル */}
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        )}

        {/* メインコンテンツ */}
        {children}
      </Box>
    </Paper>
  );
};

export default ContentCard; 