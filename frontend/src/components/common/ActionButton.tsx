'use client';

import React from 'react';
import { Button, ButtonProps, CircularProgress, useTheme, useMediaQuery } from '@mui/material';

// ボタンのバリエーション（既存を維持しつつ拡張）
export type ActionButtonVariant = 'submit' | 'save' | 'cancel' | 'default' | 'primary' | 'secondary' | 'danger' | 'ghost';

// ボタンサイズ（レスポンシブ対応）
export type ActionButtonSize = 'small' | 'medium' | 'large';
export type ResponsiveSize = ActionButtonSize | {
  xs?: ActionButtonSize;
  sm?: ActionButtonSize;
  md?: ActionButtonSize;
  lg?: ActionButtonSize;
  xl?: ActionButtonSize;
};

interface ActionButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'fullWidth'> {
  buttonType?: ActionButtonVariant;
  icon?: React.ReactNode;
  loading?: boolean;
  size?: ResponsiveSize;
  fullWidth?: boolean | {
    xs?: boolean;
    sm?: boolean;
    md?: boolean;
    lg?: boolean;
    xl?: boolean;
  };
}

/**
 * アプリケーション全体で使用される統一されたアクションボタンコンポーネント
 * 
 * @param buttonType - ボタンの種類（submit, save, cancel, default, primary, secondary, danger, ghost）
 * @param icon - ボタンのアイコン
 * @param loading - ローディング状態
 * @param size - ボタンのサイズ（small, medium, large）またはレスポンシブサイズオブジェクト
 * @param fullWidth - 幅を100%にするかどうか（ブール値またはレスポンシブオブジェクト）
 * @param children - ボタンのテキスト
 * @param props - その他のButtonコンポーネントのプロパティ
 */
const ActionButton: React.FC<ActionButtonProps> = ({
  buttonType = 'default',
  icon,
  loading = false,
  size = 'medium',
  fullWidth = false,
  children,
  ...props
}) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.only('xl'));

  // レスポンシブサイズの解決
  const getResponsiveSize = (): ActionButtonSize => {
    if (typeof size === 'string') {
      return size;
    }
    
    const responsiveSize = size as {
      xs?: ActionButtonSize;
      sm?: ActionButtonSize;
      md?: ActionButtonSize;
      lg?: ActionButtonSize;
      xl?: ActionButtonSize;
    };
    
    if (isXl && responsiveSize.xl) return responsiveSize.xl;
    if (isLg && responsiveSize.lg) return responsiveSize.lg;
    if (isMd && responsiveSize.md) return responsiveSize.md;
    if (isSm && responsiveSize.sm) return responsiveSize.sm;
    if (isXs && responsiveSize.xs) return responsiveSize.xs;
    
    return 'medium'; // デフォルト
  };

  // レスポンシブfullWidthの解決
  const getResponsiveFullWidth = (): boolean => {
    if (typeof fullWidth === 'boolean') {
      return fullWidth;
    }
    
    const responsiveFullWidth = fullWidth as {
      xs?: boolean;
      sm?: boolean;
      md?: boolean;
      lg?: boolean;
      xl?: boolean;
    };
    
    if (isXl && responsiveFullWidth.xl !== undefined) return responsiveFullWidth.xl;
    if (isLg && responsiveFullWidth.lg !== undefined) return responsiveFullWidth.lg;
    if (isMd && responsiveFullWidth.md !== undefined) return responsiveFullWidth.md;
    if (isSm && responsiveFullWidth.sm !== undefined) return responsiveFullWidth.sm;
    if (isXs && responsiveFullWidth.xs !== undefined) return responsiveFullWidth.xs;
    
    return false; // デフォルト
  };

  // ボタンタイプに基づいて適切なMUIのvariantとcolorを決定
  const getButtonProps = () => {
    switch (buttonType) {
      case 'submit':
      case 'primary':
        return {
          variant: 'contained' as const,
          color: 'primary' as const,
        };
      case 'save':
      case 'secondary':
        return {
          variant: 'outlined' as const,
          color: 'primary' as const,
        };
      case 'cancel':
        return {
          variant: 'outlined' as const,
          color: 'inherit' as const,
        };
      case 'danger':
        return {
          variant: 'contained' as const,
          color: 'error' as const,
        };
      case 'ghost':
        return {
          variant: 'text' as const,
          color: 'primary' as const,
        };
      case 'default':
      default:
        return {
          variant: 'outlined' as const,
          color: 'primary' as const,
        };
    }
  };

  const { variant, color } = getButtonProps();

  // ローディング時のアイコン表示
  const displayIcon = loading ? <CircularProgress size={16} /> : icon;

  return (
    <Button
      variant={variant}
      color={color}
      size={getResponsiveSize()}
      startIcon={displayIcon}
      disabled={loading || props.disabled}
      fullWidth={getResponsiveFullWidth()}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ActionButton; 