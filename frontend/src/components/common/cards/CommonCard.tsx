import React from 'react';
import {
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
  SxProps,
  Theme,
} from '@mui/material';

export interface CommonCardProps {
  /** カードのバリアント */
  variant?: 'default' | 'elevated' | 'outlined' | 'minimal';
  /** パディングサイズ */
  padding?: 'none' | 'small' | 'medium' | 'large';
  /** クリック可能かどうか */
  clickable?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** エラー状態 */
  error?: string | null;
  /** 最小高さ */
  minHeight?: number | string;
  /** 最小幅 */
  minWidth?: number | string;
  /** クリック時のコールバック */
  onClick?: () => void;
  /** カスタムスタイル */
  sx?: SxProps<Theme>;
  /** 子要素 */
  children?: React.ReactNode;
  /** テストID */
  'data-testid'?: string;
}

const PADDING_MAP = {
  none: 0,
  small: 1,
  medium: 2,
  large: 3,
} as const;

/**
 * アプリケーション全体で使用される統一カードコンポーネント
 * 
 * 機能:
 * - 統一されたスタイルとアニメーション
 * - ローディング・エラー状態の内蔵
 * - 複数のバリアント対応
 * - 既存コンポーネントとの互換性
 */
export const CommonCard: React.FC<CommonCardProps> = ({
  variant = 'default',
  padding = 'medium',
  clickable = false,
  loading = false,
  error = null,
  minHeight,
  minWidth,
  onClick,
  sx,
  children,
  'data-testid': testId,
}) => {
  // バリアント別のスタイル定義
  const getVariantStyles = (): SxProps<Theme> => {
    const baseStyles: SxProps<Theme> = {
      borderRadius: 2,
      minHeight,
      minWidth,
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyles,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: 'none',
        };
      case 'outlined':
        return {
          ...baseStyles,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
        };
      case 'minimal':
        return {
          ...baseStyles,
          boxShadow: 'none',
          border: 'none',
          bgcolor: 'transparent',
        };
      case 'default':
      default:
        return {
          ...baseStyles,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        };
    }
  };

  // クリック可能な場合のスタイル
  const getClickableStyles = (): SxProps<Theme> => {
    if (!clickable) return {};
    
    return {
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: variant === 'minimal' 
          ? '0 2px 8px rgba(0,0,0,0.1)' 
          : '0 6px 20px rgba(0,0,0,0.15)',
      },
    };
  };

  // 最終的なスタイルを計算
  const finalStyles: any = {
    ...(getVariantStyles() as any),
    ...(getClickableStyles() as any),
    ...(sx as any),
  };

  // ローディング状態の表示
  if (loading) {
    return (
      <Card
        sx={finalStyles}
        data-testid={testId}
      >
        <CardContent sx={{ p: PADDING_MAP[padding] }}>
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            minHeight={minHeight || 100}
          >
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // エラー状態の表示
  if (error) {
    return (
      <Card
        sx={finalStyles}
        data-testid={testId}
      >
        <CardContent sx={{ p: PADDING_MAP[padding] }}>
          <Alert severity="error" sx={{ border: 'none', bgcolor: 'transparent' }}>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 通常表示
  return (
    <Card
      onClick={onClick}
      sx={finalStyles}
      data-testid={testId}
    >
      <CardContent sx={{ p: PADDING_MAP[padding], '&:last-child': { pb: PADDING_MAP[padding] } }}>
        {children}
      </CardContent>
    </Card>
  );
}; 
