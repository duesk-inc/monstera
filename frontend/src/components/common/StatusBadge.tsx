import React from 'react';
import { Badge, Box, SxProps, Theme } from '@mui/material';

// ステータスタイプ
export type StatusType = 'selected' | 'taken' | 'available' | 'disabled';

// 表示バリアント
export type StatusVariant = 'dot' | 'outline';

// サイズ
export type StatusSize = 'small' | 'medium';

interface StatusBadgeProps {
  /** ステータスタイプ */
  status: StatusType;
  /** 表示バリアント */
  variant?: StatusVariant;
  /** サイズ */
  size?: StatusSize;
  /** 子要素（バッジを付ける対象） */
  children?: React.ReactNode;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** テストID */
  'data-testid'?: string;
}

// ステータス別の色定義
const STATUS_COLORS: Record<StatusType, string> = {
  selected: '#2196f3',    // 青色 - 選択済み
  taken: '#f44336',       // 赤色 - 取得済み/申請済み
  available: '#4caf50',   // 緑色 - 利用可能
  disabled: '#9e9e9e',    // グレー - 無効
};

// サイズ別のスタイル定義
const SIZE_STYLES = {
  small: {
    dotSize: 6,
    outlineWidth: 2,
  },
  medium: {
    dotSize: 8,
    outlineWidth: 3,
  },
};

/**
 * 統一されたステータスバッジコンポーネント
 * 
 * @param status - ステータスタイプ
 * @param variant - 表示バリアント
 * @param size - サイズ
 * @param children - 子要素
 * @param sx - カスタムスタイル
 * @param data-testid - テストID
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'dot',
  size = 'small',
  children,
  sx,
  'data-testid': testId,
}) => {
  const color = STATUS_COLORS[status];
  const sizeStyle = SIZE_STYLES[size];

  // 利用可能な状態では表示しない
  if (status === 'available') {
    return children ? <>{children}</> : null;
  }

  if (variant === 'outline') {
    // アウトライン表示の場合
    if (!children) {
      return (
        <Box
          sx={{
            width: sizeStyle.dotSize * 2,
            height: sizeStyle.dotSize * 2,
            borderRadius: '50%',
            border: `${sizeStyle.outlineWidth}px solid ${color}`,
            backgroundColor: 'transparent',
            ...sx,
          }}
          data-testid={testId}
        />
      );
    }

    return (
      <Box
        sx={{
          position: 'relative',
          display: 'inline-block',
          ...sx,
        }}
        data-testid={testId}
      >
        {children}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: sizeStyle.dotSize * 2,
            height: sizeStyle.dotSize * 2,
            borderRadius: '50%',
            border: `${sizeStyle.outlineWidth}px solid ${color}`,
            backgroundColor: 'white',
          }}
        />
      </Box>
    );
  }

  // Dot表示の場合（デフォルト）
  if (!children) {
    return (
      <Box
        sx={{
          width: sizeStyle.dotSize,
          height: sizeStyle.dotSize,
          borderRadius: '50%',
          backgroundColor: color,
          ...sx,
        }}
        data-testid={testId}
      />
    );
  }

  return (
    <Badge
      overlap="circular"
      badgeContent={
        <Box
          sx={{
            width: sizeStyle.dotSize,
            height: sizeStyle.dotSize,
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
      }
      sx={sx}
      data-testid={testId}
    >
      {children}
    </Badge>
  );
};

export default StatusBadge; 