'use client';

import React from 'react';
import { Container, ContainerProps, Box, Typography, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

export interface PageContainerProps extends Omit<ContainerProps, 'maxWidth'> {
  /** コンテナの最大幅 */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  /** 垂直方向のパディング */
  paddingY?: number;
  /** 水平方向のパディング */
  paddingX?: number;
  /** ページタイトル */
  title?: string;
  /** アクションボタン等 */
  action?: React.ReactNode;
  /** パンくずリスト */
  breadcrumbs?: React.ReactNode;
  /** 戻るボタン */
  backButton?: {
    label: string;
    onClick: () => void;
  };
  /** 子要素 */
  children: React.ReactNode;
  /** テストID */
  'data-testid'?: string;
}

/**
 * ページ全体のレイアウトコンテナ
 * 全ページで統一されたレイアウト構造を提供
 * 
 * @param maxWidth - コンテナの最大幅（デフォルト: 'lg'）
 * @param paddingY - 垂直方向のパディング（デフォルト: 4）
 * @param paddingX - 水平方向のパディング（デフォルト: undefined）
 * @param title - ページタイトル
 * @param action - アクションボタン等
 * @param breadcrumbs - パンくずリスト
 * @param children - 子要素
 * @param sx - 追加のスタイル
 * @param data-testid - テストID
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  maxWidth = 'lg',
  paddingY = 4,
  paddingX = 3,
  title,
  action,
  breadcrumbs,
  backButton,
  children,
  sx,
  'data-testid': testId,
  ...props
}) => {
  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        py: paddingY,
        px: paddingX,
        ...sx,
      }}
      data-testid={testId}
      {...props}
    >
      {backButton && (
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={backButton.onClick}
            color="inherit"
          >
            {backButton.label}
          </Button>
        </Box>
      )}
      {breadcrumbs && (
        <Box sx={{ mb: 2 }}>
          {breadcrumbs}
        </Box>
      )}
      {(title || action) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          {title && (
            <Typography variant="h4" component="h1">
              {title}
            </Typography>
          )}
          {action && <Box>{action}</Box>}
        </Box>
      )}
      {children}
    </Container>
  );
};

export default PageContainer; 