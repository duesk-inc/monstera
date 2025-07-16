'use client';

import React from 'react';
import { Box, Typography, SxProps, Theme } from '@mui/material';
import { 
  InboxOutlined as InboxIcon,
  ErrorOutline as ErrorIcon,
  SearchOff as SearchOffIcon,
  NotificationsOff as NotificationsOffIcon,
  FolderOpen as FolderOpenIcon,
} from '@mui/icons-material';

export interface EmptyStateProps {
  /** 表示するメッセージ */
  message: string;
  /** サブメッセージ（説明文） */
  description?: string;
  /** 空状態のタイプ */
  type?: 'empty' | 'error' | 'search' | 'notifications' | 'folder' | 'custom';
  /** カスタムアイコン */
  icon?: React.ReactNode;
  /** アクションボタンなどの要素 */
  actions?: React.ReactNode;
  /** パディングサイズ */
  padding?: number | string;
  /** 追加のスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * 空状態・エラー表示コンポーネント
 * 統一された空状態の表示を提供
 * 
 * @param message - 表示するメッセージ
 * @param description - サブメッセージ（説明文）
 * @param type - 空状態のタイプ（デフォルト: 'empty'）
 * @param icon - カスタムアイコン
 * @param actions - アクションボタンなどの要素
 * @param padding - パディングサイズ（デフォルト: 5）
 * @param sx - 追加のスタイル
 * @param data-testid - テストID
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  description,
  type = 'empty',
  icon,
  actions,
  padding = 5,
  sx,
  'data-testid': testId,
}) => {
  // タイプに応じたデフォルトアイコンを取得
  const getDefaultIcon = () => {
    switch (type) {
      case 'error':
        return <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />;
      case 'search':
        return <SearchOffIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
      case 'notifications':
        return <NotificationsOffIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
      case 'folder':
        return <FolderOpenIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
      case 'empty':
      default:
        return <InboxIcon sx={{ fontSize: 48, color: 'text.secondary' }} />;
    }
  };

  // 表示するアイコン
  const displayIcon = icon || getDefaultIcon();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: padding,
        ...sx,
      }}
      data-testid={testId}
    >
      {/* アイコン */}
      <Box sx={{ mb: 2 }}>
        {displayIcon}
      </Box>

      {/* メインメッセージ */}
      <Typography
        variant="h6"
        color={type === 'error' ? 'error.main' : 'text.secondary'}
        sx={{ mb: description ? 1 : 2, fontWeight: 'medium' }}
      >
        {message}
      </Typography>

      {/* 説明文 */}
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, maxWidth: 400 }}
        >
          {description}
        </Typography>
      )}

      {/* アクション */}
      {actions && (
        <Box sx={{ mt: 1 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
};

export default EmptyState; 