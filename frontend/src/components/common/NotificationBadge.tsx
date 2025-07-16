import React from 'react';
import { Badge, Chip, Box, SxProps, Theme } from '@mui/material';
import { BORDER_RADIUS, ICON_SIZES } from '@/constants/dimensions';

// 通知バッジの表示タイプ
export type NotificationVariant = 'count' | 'dot' | 'chip';

// 通知バッジの位置
export type NotificationPosition = 'top-right' | 'inline';

interface NotificationBadgeProps {
  /** 通知カウント数 */
  count?: number;
  /** 未読ドット表示フラグ */
  showDot?: boolean;
  /** 表示タイプ */
  variant?: NotificationVariant;
  /** 表示位置 */
  position?: NotificationPosition;
  /** 子要素（バッジを付ける対象） */
  children?: React.ReactNode;
  /** 最大表示カウント数 */
  max?: number;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

/**
 * 統一された通知バッジコンポーネント
 * 
 * @param count - 通知カウント数
 * @param showDot - 未読ドット表示フラグ
 * @param variant - 表示タイプ
 * @param position - 表示位置
 * @param children - 子要素
 * @param max - 最大表示カウント数
 * @param sx - カスタムスタイル
 * @param data-testid - テストID
 */
export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count = 0,
  showDot = false,
  variant = 'count',
  position = 'top-right',
  children,
  max = 99,
  sx,
  'data-testid': testId,
}) => {
  // 表示すべき通知があるかチェック
  const hasNotification = count > 0 || showDot;
  
  // Chip variant の場合
  if (variant === 'chip') {
    if (count <= 0) return null;
    
    return (
      <Chip
        size="small"
        label={`${count}件`}
        color="secondary"
        sx={{
          height: 22,
          fontWeight: 'bold',
          ...sx,
        }}
        data-testid={testId}
      />
    );
  }

  // Dot variant の場合
  if (variant === 'dot') {
    if (!hasNotification) {
      return children ? <>{children}</> : null;
    }

    if (position === 'inline') {
      return (
        <Box
          sx={{
            width: ICON_SIZES.XS - 6,
            height: ICON_SIZES.XS - 6,
            borderRadius: BORDER_RADIUS.FULL,
            bgcolor: 'primary.main',
            ...sx,
          }}
          data-testid={testId}
        />
      );
    }

    // position === 'top-right' の場合
    return (
      <Badge
        variant="dot"
        color="primary"
        sx={sx}
        data-testid={testId}
      >
        {children}
      </Badge>
    );
  }

  // Count variant の場合（デフォルト）
  if (!hasNotification) {
    return children ? <>{children}</> : null;
  }

  if (position === 'inline') {
    // インライン表示の場合は Chip を使用
    return (
      <Chip
        size="small"
        label={count > max ? `${max}+` : count.toString()}
        color="primary"
        sx={{
          height: 20,
          fontSize: '0.75rem',
          fontWeight: 'bold',
          ...sx,
        }}
        data-testid={testId}
      />
    );
  }

  // top-right の場合は Badge を使用
  return (
    <Badge
      badgeContent={count > max ? `${max}+` : count}
      color="primary"
      max={max}
      sx={sx}
      data-testid={testId}
    >
      {children}
    </Badge>
  );
};

export default NotificationBadge; 