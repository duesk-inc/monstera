'use client';

import React from 'react';
import { Box, Typography, Breadcrumbs, SxProps, Theme } from '@mui/material';

export interface PageHeaderProps {
  /** ページタイトル */
  title: string;
  /** サブタイトルまたは説明 */
  subtitle?: string;
  /** アクションボタンなどの要素 */
  actions?: React.ReactNode;
  /** パンくずリスト */
  breadcrumbs?: React.ReactNode;
  /** タイトルのバリアント */
  titleVariant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** 下部マージン */
  marginBottom?: number;
  /** 追加のスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * ページヘッダーコンポーネント
 * タイトル、サブタイトル、アクション、パンくずリストを統一されたレイアウトで表示
 * 
 * @param title - ページタイトル
 * @param subtitle - サブタイトルまたは説明
 * @param actions - アクションボタンなどの要素
 * @param breadcrumbs - パンくずリスト
 * @param titleVariant - タイトルのバリアント（デフォルト: 'h4'）
 * @param marginBottom - 下部マージン（デフォルト: 3）
 * @param sx - 追加のスタイル
 * @param data-testid - テストID
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  titleVariant = 'h4',
  marginBottom = 3,
  sx,
  'data-testid': testId,
}) => {
  return (
    <Box
      sx={{
        mb: marginBottom,
        ...sx,
      }}
      data-testid={testId}
    >
      {/* パンくずリスト */}
      {breadcrumbs && (
        <Box sx={{ mb: 2 }}>
          {React.isValidElement(breadcrumbs) ? (
            breadcrumbs
          ) : (
            <Breadcrumbs>{breadcrumbs}</Breadcrumbs>
          )}
        </Box>
      )}

      {/* タイトル行 */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: subtitle ? 1 : 0,
        }}
      >
        <Typography
          variant={titleVariant}
          component="h1"
          fontWeight="bold"
          sx={{ flexGrow: 1 }}
        >
          {title}
        </Typography>
        
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
          variant="body1"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default PageHeader; 