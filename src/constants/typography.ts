/**
 * タイポグラフィ関連の定数
 */

// フォントウェイト
export const FONT_WEIGHT = {
  THIN: 100,
  EXTRA_LIGHT: 200,
  LIGHT: 300,
  REGULAR: 400,
  MEDIUM: 500,
  SEMI_BOLD: 600,
  BOLD: 700,
  EXTRA_BOLD: 800,
  BLACK: 900,
} as const;

// フォントサイズ（px）
export const FONT_SIZE = {
  XXS: 10,
  XS: 12,
  SM: 14,
  BASE: 16,
  MD: 18,
  LG: 20,
  XL: 24,
  XXL: 30,
  XXXL: 36,
  XXXXL: 48,
} as const;

// 特殊用途のフォントサイズ
export const FONT_SIZE_SPECIAL = {
  CAPTION: 11,
  OVERLINE: 10,
  BODY_SMALL: 13,
  BODY_LARGE: 17,
  SUBTITLE: 15,
  DISPLAY: 56,
} as const;

// 行間（line-height）
export const LINE_HEIGHT = {
  NONE: 1,
  TIGHT: 1.25,
  SNUG: 1.375,
  NORMAL: 1.5,
  RELAXED: 1.625,
  LOOSE: 2,
} as const;

// 文字間隔（letter-spacing）
export const LETTER_SPACING = {
  TIGHTER: '-0.05em',
  TIGHT: '-0.025em',
  NORMAL: '0',
  WIDE: '0.025em',
  WIDER: '0.05em',
  WIDEST: '0.1em',
} as const;

// フォントファミリー
export const FONT_FAMILY = {
  SANS: '"Roboto", "Helvetica", "Arial", sans-serif',
  SERIF: '"Georgia", "Times New Roman", serif',
  MONO: '"Roboto Mono", "Courier New", monospace',
  DISPLAY: '"Roboto", "Helvetica", "Arial", sans-serif',
} as const;

// タイポグラフィバリアント（MUIに準拠）
export const TYPOGRAPHY_VARIANTS = {
  h1: {
    fontSize: FONT_SIZE.XXXXL,
    fontWeight: FONT_WEIGHT.LIGHT,
    lineHeight: LINE_HEIGHT.TIGHT,
    letterSpacing: LETTER_SPACING.TIGHT,
  },
  h2: {
    fontSize: FONT_SIZE.XXXL,
    fontWeight: FONT_WEIGHT.LIGHT,
    lineHeight: LINE_HEIGHT.TIGHT,
    letterSpacing: LETTER_SPACING.TIGHT,
  },
  h3: {
    fontSize: FONT_SIZE.XXL,
    fontWeight: FONT_WEIGHT.REGULAR,
    lineHeight: LINE_HEIGHT.SNUG,
    letterSpacing: LETTER_SPACING.NORMAL,
  },
  h4: {
    fontSize: FONT_SIZE.XL,
    fontWeight: FONT_WEIGHT.REGULAR,
    lineHeight: LINE_HEIGHT.SNUG,
    letterSpacing: LETTER_SPACING.WIDE,
  },
  h5: {
    fontSize: FONT_SIZE.LG,
    fontWeight: FONT_WEIGHT.REGULAR,
    lineHeight: LINE_HEIGHT.NORMAL,
    letterSpacing: LETTER_SPACING.NORMAL,
  },
  h6: {
    fontSize: FONT_SIZE.MD,
    fontWeight: FONT_WEIGHT.MEDIUM,
    lineHeight: LINE_HEIGHT.NORMAL,
    letterSpacing: LETTER_SPACING.WIDE,
  },
  subtitle1: {
    fontSize: FONT_SIZE.BASE,
    fontWeight: FONT_WEIGHT.REGULAR,
    lineHeight: LINE_HEIGHT.RELAXED,
    letterSpacing: LETTER_SPACING.WIDE,
  },
  subtitle2: {
    fontSize: FONT_SIZE.SM,
    fontWeight: FONT_WEIGHT.MEDIUM,
    lineHeight: LINE_HEIGHT.NORMAL,
    letterSpacing: LETTER_SPACING.WIDE,
  },
  body1: {
    fontSize: FONT_SIZE.BASE,
    fontWeight: FONT_WEIGHT.REGULAR,
    lineHeight: LINE_HEIGHT.NORMAL,
    letterSpacing: LETTER_SPACING.NORMAL,
  },
  body2: {
    fontSize: FONT_SIZE.SM,
    fontWeight: FONT_WEIGHT.REGULAR,
    lineHeight: LINE_HEIGHT.NORMAL,
    letterSpacing: LETTER_SPACING.NORMAL,
  },
  button: {
    fontSize: FONT_SIZE.SM,
    fontWeight: FONT_WEIGHT.MEDIUM,
    lineHeight: LINE_HEIGHT.RELAXED,
    letterSpacing: LETTER_SPACING.WIDER,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: FONT_SIZE.XS,
    fontWeight: FONT_WEIGHT.REGULAR,
    lineHeight: LINE_HEIGHT.NORMAL,
    letterSpacing: LETTER_SPACING.NORMAL,
  },
  overline: {
    fontSize: FONT_SIZE.XXS,
    fontWeight: FONT_WEIGHT.REGULAR,
    lineHeight: LINE_HEIGHT.LOOSE,
    letterSpacing: LETTER_SPACING.WIDEST,
    textTransform: 'uppercase' as const,
  },
} as const;

// レスポンシブフォントサイズ
export const RESPONSIVE_FONT_SIZE = {
  h1: { mobile: FONT_SIZE.XXXL, desktop: FONT_SIZE.XXXXL },
  h2: { mobile: FONT_SIZE.XXL, desktop: FONT_SIZE.XXXL },
  h3: { mobile: FONT_SIZE.XL, desktop: FONT_SIZE.XXL },
  h4: { mobile: FONT_SIZE.LG, desktop: FONT_SIZE.XL },
  h5: { mobile: FONT_SIZE.MD, desktop: FONT_SIZE.LG },
  h6: { mobile: FONT_SIZE.BASE, desktop: FONT_SIZE.MD },
} as const;

// テキスト装飾
export const TEXT_DECORATION = {
  NONE: 'none',
  UNDERLINE: 'underline',
  LINE_THROUGH: 'line-through',
  OVERLINE: 'overline',
} as const;

// テキスト変換
export const TEXT_TRANSFORM = {
  NONE: 'none',
  CAPITALIZE: 'capitalize',
  UPPERCASE: 'uppercase',
  LOWERCASE: 'lowercase',
} as const;

// ユーティリティ関数
export const remToPx = (rem: number): number => rem * 16;
export const pxToRem = (px: number): string => `${px / 16}rem`;

// 後方互換性のためのエクスポート
export const FONT_SIZES = FONT_SIZE;
export const FONT_WEIGHTS = FONT_WEIGHT;
export const SPECIAL_FONT_SIZES = FONT_SIZE_SPECIAL;
export const LINE_HEIGHTS = LINE_HEIGHT;
export const SEMANTIC_FONT_WEIGHTS = {
  THIN: FONT_WEIGHT.THIN,
  LIGHT: FONT_WEIGHT.LIGHT,
  REGULAR: FONT_WEIGHT.REGULAR,
  MEDIUM: FONT_WEIGHT.MEDIUM,
  BOLD: FONT_WEIGHT.BOLD,
  BLACK: FONT_WEIGHT.BLACK,
} as const;

// よく使われる組み合わせ
export const COMMON_TYPOGRAPHY = {
  PAGE_TITLE: {
    fontSize: FONT_SIZE.XXL,
    fontWeight: FONT_WEIGHT.BOLD,
    lineHeight: LINE_HEIGHT.TIGHT,
  },
  SECTION_TITLE: {
    fontSize: FONT_SIZE.LG,
    fontWeight: FONT_WEIGHT.SEMI_BOLD,
    lineHeight: LINE_HEIGHT.SNUG,
  },
  CARD_TITLE: {
    fontSize: FONT_SIZE.MD,
    fontWeight: FONT_WEIGHT.MEDIUM,
    lineHeight: LINE_HEIGHT.NORMAL,
  },
  LABEL: {
    fontSize: FONT_SIZE.SM,
    fontWeight: FONT_WEIGHT.MEDIUM,
    lineHeight: LINE_HEIGHT.NORMAL,
  },
  HELPER_TEXT: {
    fontSize: FONT_SIZE.XS,
    fontWeight: FONT_WEIGHT.REGULAR,
    lineHeight: LINE_HEIGHT.NORMAL,
  },
} as const;