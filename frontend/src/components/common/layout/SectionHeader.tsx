'use client';

import React from 'react';
import { Box, Typography, SxProps, Theme } from '@mui/material';

export interface SectionHeaderProps {
  /** セクションタイトル */
  title: string;
  /** サブタイトルまたは説明 */
  subtitle?: string;
  /** アクションボタンなどの要素 */
  actions?: React.ReactNode;
  /** タイトルのバリアント */
  titleVariant?: 'h5' | 'h6' | 'subtitle1' | 'subtitle2';
  /** アイコン */
  icon?: React.ReactNode;
  /** スペーシング */
  spacing?: 'compact' | 'normal' | 'comfortable';
  /** 下部マージン */
  marginBottom?: number;
  /** 追加のスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * セクションヘッダーコンポーネント
 * セクション見出しを統一されたレイアウトで表示
 * 
 * @param title - セクションタイトル
 * @param subtitle - サブタイトルまたは説明
 * @param actions - アクションボタンなどの要素
 * @param titleVariant - タイトルのバリアント（デフォルト: 'h6'）
 * @param icon - アイコン
 * @param spacing - スペーシング（デフォルト: 'normal'）
 * @param marginBottom - 下部マージン（デフォルト: 2）
 * @param sx - 追加のスタイル
 * @param data-testid - テストID
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actions,
  titleVariant = 'h6',
  icon,
  spacing = 'normal',
  marginBottom,
  sx,
  'data-testid': testId,
}) => {
  // スペーシングに応じたマージン
  const getMarginBottom = () => {
    if (marginBottom !== undefined) return marginBottom;
    
    switch (spacing) {
      case 'compact':
        return 1.5;
      case 'comfortable':
        return 3;
      case 'normal':
      default:
        return 2;
    }
  };

  return (
    <Box
      sx={{
        mb: getMarginBottom(),
        ...sx,
      }}
      data-testid={testId}
    >
      {/* タイトル行 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: subtitle ? 0.5 : 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexGrow: 1,
          }}
        >
          {icon && (
            <Box
              sx={{
                mr: 1,
                display: 'flex',
                alignItems: 'center',
                color: 'primary.main',
              }}
            >
              {icon}
            </Box>
          )}
          
          <Typography
            variant={titleVariant}
            component="h3"
            fontWeight="bold"
            sx={{ flexGrow: 1 }}
          >
            {title}
          </Typography>
        </Box>
        
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

      {/* サブタイトル */}
      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ 
            mt: 0.5,
            ...(icon && { ml: 4 }) // アイコンがある場合はインデント
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default SectionHeader; 