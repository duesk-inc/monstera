import { SxProps, Theme } from '@mui/material/styles';
import { FONT_SIZE, FONT_WEIGHT } from '@/constants/typography';
import { DIALOG, COMPONENT_SIZES, BORDER_RADIUS } from '@/constants/dimensions';

// Gmail風ダイアログの共通テーマ
export const DIALOG_THEME = {
  // 基本サイズ
  sizes: {
    xs: { minWidth: 320, maxWidth: DIALOG.WIDTH.XS },
    sm: { minWidth: 480, maxWidth: DIALOG.WIDTH.SM },
    md: { minWidth: 600, maxWidth: DIALOG.WIDTH.MD },
    lg: { minWidth: 800, maxWidth: DIALOG.WIDTH.LG },
  },
  
  // 基本スタイル
  paper: {
    borderRadius: 1,
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.28)',
  },
  
  // タイトルスタイル
  title: {
    fontSize: FONT_SIZE.XL,
    fontWeight: FONT_WEIGHT.MEDIUM,
    lineHeight: 1.3,
    color: 'text.primary',
  },
  
  // 本文スタイル
  content: {
    fontSize: FONT_SIZE.MD,
    lineHeight: 1.5,
    color: 'text.secondary',
  },
  
  // ボタンスタイル
  button: {
    minWidth: 80,
    height: COMPONENT_SIZES.BUTTON.HEIGHT.MD,
    fontSize: FONT_SIZE.MD,
  },
  
  // アイコンコンテナ
  iconContainer: {
    base: {
      width: COMPONENT_SIZES.ICON.LG + 8,
      height: COMPONENT_SIZES.ICON.LG + 8,
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    small: {
      width: 32,
      height: 32,
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
  },
  
  // スペーシング
  spacing: {
    padding: 3,
    gap: 1.5,
  },
} as const;

// Gmail風カラーパレット
export const GMAIL_COLORS = {
  primary: {
    main: '#1a73e8',
    light: '#e8f0fe',
    dark: '#1557b0',
  },
  success: {
    main: '#34a853',
    light: '#e6f4ea',
    dark: '#137333',
  },
  warning: {
    main: '#fbbc04',
    light: '#fef7e0',
    dark: '#f09300',
  },
  error: {
    main: '#ea4335',
    light: '#fce8e6',
    dark: '#c5221f',
  },
  text: {
    primary: '#202124',
    secondary: '#5f6368',
  },
  action: {
    hover: 'rgba(60, 64, 67, 0.08)',
  },
} as const;

// 共通スタイルヘルパー
export const createDialogStyles = (size: keyof typeof DIALOG_THEME.sizes): SxProps<Theme> => ({
  borderRadius: DIALOG_THEME.paper.borderRadius,
  boxShadow: DIALOG_THEME.paper.boxShadow,
  ...DIALOG_THEME.sizes[size],
});

export const createIconContainerStyles = (
  variant: 'primary' | 'success' | 'warning' | 'error',
  size: 'base' | 'small' = 'base'
): SxProps<Theme> => ({
  ...DIALOG_THEME.iconContainer[size],
  bgcolor: `${variant}.light`,
  '& svg': {
    fontSize: size === 'small' ? 18 : 20,
    color: `${variant}.main`,
  },
});

export const createTitleStyles = (): SxProps<Theme> => ({
  ...DIALOG_THEME.title,
});

export const createContentStyles = (): SxProps<Theme> => ({
  ...DIALOG_THEME.content,
});

export const createButtonStyles = (): SxProps<Theme> => ({
  ...DIALOG_THEME.button,
}); 