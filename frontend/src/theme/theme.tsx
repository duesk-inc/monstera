'use client';

import { createTheme, alpha } from '@mui/material/styles';
import { 
  FONT_WEIGHTS as FONT_WEIGHT,
  FONT_SIZES,
  LINE_HEIGHTS as LINE_HEIGHT,
  HEADING_STYLES,
  BODY_STYLES,
} from '@/constants/typography';
import { LAYOUT, BORDER_RADIUS, COMPONENT_SIZES, SPACING } from '@/constants/dimensions';

// アプリケーション全体で共通の定数（後方互換性のため残す）
export const APP_CONSTANTS = {
  SELECT_HEIGHT: COMPONENT_SIZES.INPUT.HEIGHT.MD,
  SIDEBAR_WIDTH: (LAYOUT as any).SIDEBAR_WIDTH ?? '16rem',
  FONT_SIZES,
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
    h1: { fontSize: HEADING_STYLES.H1.fontSize, fontWeight: HEADING_STYLES.H1.fontWeight, lineHeight: HEADING_STYLES.H1.lineHeight },
    h2: { fontSize: HEADING_STYLES.H2.fontSize, fontWeight: HEADING_STYLES.H2.fontWeight, lineHeight: HEADING_STYLES.H2.lineHeight },
    h3: { fontSize: HEADING_STYLES.H3.fontSize, fontWeight: HEADING_STYLES.H3.fontWeight, lineHeight: HEADING_STYLES.H3.lineHeight },
    h4: { fontSize: HEADING_STYLES.H4.fontSize, fontWeight: HEADING_STYLES.H4.fontWeight, lineHeight: HEADING_STYLES.H4.lineHeight },
    h5: { fontSize: HEADING_STYLES.H5.fontSize, fontWeight: HEADING_STYLES.H5.fontWeight, lineHeight: HEADING_STYLES.H5.lineHeight },
    h6: { fontSize: HEADING_STYLES.H6.fontSize, fontWeight: HEADING_STYLES.H6.fontWeight, lineHeight: HEADING_STYLES.H6.lineHeight },
    body1: { fontSize: BODY_STYLES.MEDIUM.fontSize, lineHeight: BODY_STYLES.MEDIUM.lineHeight },
    body2: { fontSize: BODY_STYLES.SMALL.fontSize, lineHeight: BODY_STYLES.SMALL.lineHeight },
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
          fontWeight: FONT_WEIGHT.SEMIBOLD,
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
          fontWeight: FONT_WEIGHT.SEMIBOLD,
          backgroundColor: alpha(PRIMARY_COLOR.main, 0.05),
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: FONT_WEIGHT.SEMIBOLD,
          fontSize: FONT_SIZES.SM,
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
          width: (LAYOUT as any).SIDEBAR_WIDTH ?? '16rem',
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
            fontWeight: FONT_WEIGHT.SEMIBOLD,
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
          fontWeight: FONT_WEIGHT.SEMIBOLD,
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
