'use client';

import { createTheme, alpha } from '@mui/material/styles';
import { 
  FONT_WEIGHT, 
  FONT_SIZE, 
	FONT_SIZES,
  FONT_SIZE_SPECIAL,
  LINE_HEIGHT,
  TYPOGRAPHY_VARIANTS 
} from '@/constants/typography';
import { 
  LAYOUT,
	LAYOUT_DIMENSIONS,
  BORDER_RADIUS,
  COMPONENT_SIZES,
  SPACING
} from '@/constants/dimensions';

// アプリケーション全体で共通の定数（後方互換性のため残す）
export const APP_CONSTANTS = {
  SELECT_HEIGHT: COMPONENT_SIZES.INPUT.HEIGHT.MD,  // セレクトボックスの高さを一元管理
  SIDEBAR_WIDTH: LAYOUT.SIDEBAR_WIDTH, // サイドバーの幅
  // フォントサイズの一元管理
  FONT_SIZES: FONT_SIZE_SPECIAL
};

// カラーパレット設定
const PRIMARY_COLOR = {
  light: '#E6E6EB', 
  main: '#49326E', 
  dark: '#2D2147', 
};

// テーマを作成
const theme = createTheme({
  palette: {
    primary: {
      light: PRIMARY_COLOR.light,
      main: PRIMARY_COLOR.main, 
      dark: PRIMARY_COLOR.dark,
      contrastText: '#fff',
    },
    secondary: {
      light: '#ff9e40',
      main: '#f57c00', // オレンジ色（アクセントカラー）
      dark: '#bb4d00',
      contrastText: '#fff',
    },
    error: {
      light: '#ef5350',
      main: '#d32f2f',
      dark: '#c62828',
    },
    background: {
      default: '#f5f6fa', // 背景色（淡いグレー）
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontSize: 14, // 基本フォントサイズ（px）
    fontFamily: [
      'Hiragino Sans',
      'Hiragino Kaku Gothic ProN',
      'Meiryo',
      'sans-serif',
      '-apple-system',
      'BlinkMacSystemFont',
      'Roboto',
      'Arial',
    ].join(','),
    h1: TYPOGRAPHY_VARIANTS.h1,
    h2: TYPOGRAPHY_VARIANTS.h2,
    h3: TYPOGRAPHY_VARIANTS.h3,
    h4: TYPOGRAPHY_VARIANTS.h4,
    h5: TYPOGRAPHY_VARIANTS.h5,
    h6: TYPOGRAPHY_VARIANTS.h6,
    subtitle1: TYPOGRAPHY_VARIANTS.subtitle1,
    subtitle2: TYPOGRAPHY_VARIANTS.subtitle2,
    body1: TYPOGRAPHY_VARIANTS.body1,
    body2: TYPOGRAPHY_VARIANTS.body2,
    caption: TYPOGRAPHY_VARIANTS.caption,
    overline: TYPOGRAPHY_VARIANTS.overline,
    button: TYPOGRAPHY_VARIANTS.button,
  },
  shape: {
    borderRadius: BORDER_RADIUS.MD,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // グローバルスタイル
        '& .MuiSvgIcon-colorPrimary': {
          color: PRIMARY_COLOR.main,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          height: APP_CONSTANTS.SELECT_HEIGHT,
          display: 'flex',
          alignItems: 'center',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          '&.MuiOutlinedInput-root': {
            borderRadius: BORDER_RADIUS.MD,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: PRIMARY_COLOR.main,
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: PRIMARY_COLOR.main,
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: PRIMARY_COLOR.main,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.MD,
          textTransform: 'none',
          fontWeight: FONT_WEIGHT.SEMI_BOLD,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
        containedPrimary: {
          backgroundColor: PRIMARY_COLOR.main,
          '&:hover': {
            backgroundColor: PRIMARY_COLOR.dark,
          }
        },
        outlinedPrimary: {
          borderColor: PRIMARY_COLOR.main,
          color: PRIMARY_COLOR.main,
          '&:hover': {
            backgroundColor: alpha(PRIMARY_COLOR.main, 0.04),
          },
        },
        textPrimary: {
          color: PRIMARY_COLOR.main,
          '&:hover': {
            backgroundColor: alpha(PRIMARY_COLOR.main, 0.04),
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(PRIMARY_COLOR.main, 0.04),
          },
          '&.Mui-focusVisible': {
            backgroundColor: alpha(PRIMARY_COLOR.main, 0.12),
          },
        },
        colorPrimary: {
          color: PRIMARY_COLOR.main,
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        colorPrimary: {
          color: PRIMARY_COLOR.main,
        },
        colorAction: {
          color: alpha(PRIMARY_COLOR.main, 0.54),
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        text: {
          fontSize: '0.75rem', // 12px
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.LG,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.LG,
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: FONT_WEIGHT.SEMI_BOLD,
          backgroundColor: alpha(PRIMARY_COLOR.main, 0.05),
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: FONT_WEIGHT.SEMI_BOLD,
          fontSize: FONT_SIZES.MD,
          '&.Mui-selected': {
            color: PRIMARY_COLOR.main,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: PRIMARY_COLOR.main,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: LAYOUT_DIMENSIONS.ADMIN_SIDEBAR_WIDTH,
          backgroundColor: '#ffffff',
          borderRight: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.MD,
          margin: `${SPACING.XS}px ${SPACING.SM}px`,
          '&.Mui-selected': {
            backgroundColor: alpha(PRIMARY_COLOR.main, 0.08),
            color: PRIMARY_COLOR.main,
            fontWeight: FONT_WEIGHT.SEMI_BOLD,
            '&:hover': {
              backgroundColor: alpha(PRIMARY_COLOR.main, 0.12),
            },
            '& .MuiListItemIcon-root': {
              color: PRIMARY_COLOR.main,
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.XL,
          fontWeight: FONT_WEIGHT.SEMI_BOLD,
        },
        colorPrimary: {
          backgroundColor: PRIMARY_COLOR.main,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: alpha(PRIMARY_COLOR.main, 0.6),
          '&.Mui-checked': {
            color: PRIMARY_COLOR.main,
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: alpha(PRIMARY_COLOR.main, 0.6),
          '&.Mui-checked': {
            color: PRIMARY_COLOR.main,
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: PRIMARY_COLOR.main,
            '& + .MuiSwitch-track': {
              backgroundColor: PRIMARY_COLOR.main,
            },
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          backgroundColor: PRIMARY_COLOR.main,
          '&:hover': {
            backgroundColor: PRIMARY_COLOR.dark,
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: PRIMARY_COLOR.main,
          '&:hover': {
            color: PRIMARY_COLOR.dark,
          },
        },
      },
    },
  },
});

export default theme; 