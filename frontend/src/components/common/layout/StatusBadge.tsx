'use client';

import React from 'react';
import { Chip, SxProps, Theme } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

export type StatusType = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'draft' 
  | 'submitted'
  | 'custom';

export interface StatusBadgeProps {
  /** ステータスのタイプ */
  status: StatusType;
  /** 表示するラベル */
  label: string;
  /** カスタムカラー（statusが'custom'の場合） */
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** カスタムアイコン */
  icon?: React.ReactElement;
  /** バリアント */
  variant?: 'filled' | 'outlined';
  /** サイズ */
  size?: 'small' | 'medium';
  /** 追加のスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * ステータス表示用バッジコンポーネント
 * 統一されたステータス表示を提供
 * 
 * @param status - ステータスのタイプ
 * @param label - 表示するラベル
 * @param color - カスタムカラー（statusが'custom'の場合）
 * @param icon - カスタムアイコン
 * @param variant - バリアント（デフォルト: 'filled'）
 * @param size - サイズ（デフォルト: 'small'）
 * @param sx - 追加のスタイル
 * @param data-testid - テストID
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  color,
  icon,
  variant = 'filled',
  size = 'small',
  sx,
  'data-testid': testId,
}) => {
  // ステータスに応じたカラーとアイコンを取得
  const getStatusConfig = () => {
    if (status === 'custom') {
      return {
        color: color || 'default',
        icon: icon,
      };
    }

    switch (status) {
      case 'success':
      case 'approved':
        return {
          color: 'success' as const,
          icon: <CheckCircleIcon />,
        };
      case 'error':
      case 'rejected':
        return {
          color: 'error' as const,
          icon: <CancelIcon />,
        };
      case 'warning':
        return {
          color: 'warning' as const,
          icon: <WarningIcon />,
        };
      case 'info':
        return {
          color: 'info' as const,
          icon: <InfoIcon />,
        };
      case 'pending':
      case 'draft':
      case 'submitted':
        return {
          color: 'default' as const,
          icon: <ScheduleIcon />,
        };
      default:
        return {
          color: 'default' as const,
          icon: undefined,
        };
    }
  };

  const { color: statusColor, icon: statusIcon } = getStatusConfig();
  const displayIcon = icon || statusIcon;

  return (
    <Chip
      label={label}
      color={statusColor}
      variant={variant}
      size={size}
      icon={displayIcon}
      sx={{
        fontWeight: 'medium',
        ...sx,
      }}
      data-testid={testId}
    />
  );
};

export default StatusBadge; 