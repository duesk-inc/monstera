// タイポグラフィ関連の定数定義

// フォントサイズ
export const FONT_SIZES = {
  XS: "0.75rem", // 12px
  SM: "0.875rem", // 14px
  BASE: "1rem", // 16px
  LG: "1.125rem", // 18px
  XL: "1.25rem", // 20px
  "2XL": "1.5rem", // 24px
  "3XL": "1.875rem", // 30px
  "4XL": "2.25rem", // 36px
  "5XL": "3rem", // 48px
} as const;

// フォントウェイト
export const FONT_WEIGHTS = {
  THIN: 100,
  EXTRALIGHT: 200,
  LIGHT: 300,
  NORMAL: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 700,
  EXTRABOLD: 800,
  BLACK: 900,
} as const;

// 行間
export const LINE_HEIGHTS = {
  TIGHT: 1.25,
  SNUG: 1.375,
  NORMAL: 1.5,
  RELAXED: 1.625,
  LOOSE: 2,
} as const;

// 文字間隔
export const LETTER_SPACINGS = {
  TIGHTER: "-0.05em",
  TIGHT: "-0.025em",
  NORMAL: "0em",
  WIDE: "0.025em",
  WIDER: "0.05em",
  WIDEST: "0.1em",
} as const;

// フォントファミリー
export const FONT_FAMILIES = {
  SANS: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "Noto Sans",
    "sans-serif",
    "Apple Color Emoji",
    "Segoe UI Emoji",
    "Segoe UI Symbol",
    "Noto Color Emoji",
  ],
  SERIF: [
    "ui-serif",
    "Georgia",
    "Cambria",
    "Times New Roman",
    "Times",
    "serif",
  ],
  MONO: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Consolas",
    "Liberation Mono",
    "Courier New",
    "monospace",
  ],
  JAPANESE: [
    "Noto Sans JP",
    "Hiragino Kaku Gothic ProN",
    "Hiragino Sans",
    "Yu Gothic",
    "Meiryo",
    "Takao",
    "IPAexGothic",
    "IPAPGothic",
    "VL PGothic",
    "Osaka",
    "MS PGothic",
    "MS Gothic",
    "sans-serif",
  ],
} as const;

// 見出しスタイル
export const HEADING_STYLES = {
  H1: {
    fontSize: FONT_SIZES["4XL"],
    fontWeight: FONT_WEIGHTS.BOLD,
    lineHeight: LINE_HEIGHTS.TIGHT,
    letterSpacing: LETTER_SPACINGS.TIGHT,
  },
  H2: {
    fontSize: FONT_SIZES["3XL"],
    fontWeight: FONT_WEIGHTS.BOLD,
    lineHeight: LINE_HEIGHTS.TIGHT,
    letterSpacing: LETTER_SPACINGS.TIGHT,
  },
  H3: {
    fontSize: FONT_SIZES["2XL"],
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    lineHeight: LINE_HEIGHTS.SNUG,
    letterSpacing: LETTER_SPACINGS.NORMAL,
  },
  H4: {
    fontSize: FONT_SIZES.XL,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    lineHeight: LINE_HEIGHTS.SNUG,
    letterSpacing: LETTER_SPACINGS.NORMAL,
  },
  H5: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    lineHeight: LINE_HEIGHTS.NORMAL,
    letterSpacing: LETTER_SPACINGS.NORMAL,
  },
  H6: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    lineHeight: LINE_HEIGHTS.NORMAL,
    letterSpacing: LETTER_SPACINGS.NORMAL,
  },
} as const;

// 本文スタイル
export const BODY_STYLES = {
  LARGE: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.NORMAL,
    lineHeight: LINE_HEIGHTS.RELAXED,
    letterSpacing: LETTER_SPACINGS.NORMAL,
  },
  MEDIUM: {
    fontSize: FONT_SIZES.BASE,
    fontWeight: FONT_WEIGHTS.NORMAL,
    lineHeight: LINE_HEIGHTS.NORMAL,
    letterSpacing: LETTER_SPACINGS.NORMAL,
  },
  SMALL: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.NORMAL,
    lineHeight: LINE_HEIGHTS.NORMAL,
    letterSpacing: LETTER_SPACINGS.NORMAL,
  },
  TINY: {
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.NORMAL,
    lineHeight: LINE_HEIGHTS.NORMAL,
    letterSpacing: LETTER_SPACINGS.NORMAL,
  },
} as const;

// ラベルスタイル
export const LABEL_STYLES = {
  LARGE: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    lineHeight: LINE_HEIGHTS.NORMAL,
    letterSpacing: LETTER_SPACINGS.WIDE,
  },
  MEDIUM: {
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    lineHeight: LINE_HEIGHTS.NORMAL,
    letterSpacing: LETTER_SPACINGS.WIDE,
  },
  SMALL: {
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    lineHeight: LINE_HEIGHTS.NORMAL,
    letterSpacing: LETTER_SPACINGS.WIDER,
  },
} as const;

// キャプションスタイル
export const CAPTION_STYLES = {
  LARGE: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.NORMAL,
    lineHeight: LINE_HEIGHTS.NORMAL,
    letterSpacing: LETTER_SPACINGS.NORMAL,
  },
  MEDIUM: {
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.NORMAL,
    lineHeight: LINE_HEIGHTS.NORMAL,
    letterSpacing: LETTER_SPACINGS.NORMAL,
  },
} as const;

// テキストの省略表示
export const TEXT_TRUNCATION = {
  SINGLE_LINE: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  MULTI_LINE: (lines: number) => ({
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  }),
} as const;

// テキストの変換
export const TEXT_TRANSFORMS = {
  UPPERCASE: "uppercase",
  LOWERCASE: "lowercase",
  CAPITALIZE: "capitalize",
  NONE: "none",
} as const;

// テキストの装飾
export const TEXT_DECORATIONS = {
  UNDERLINE: "underline",
  OVERLINE: "overline",
  LINE_THROUGH: "line-through",
  NONE: "none",
} as const;

// テキストの配置
export const TEXT_ALIGNMENTS = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
  JUSTIFY: "justify",
} as const;

// 段落スタイル
export const PARAGRAPH_STYLES = {
  DEFAULT: {
    marginBottom: "1rem",
    ...BODY_STYLES.MEDIUM,
  },
  LEAD: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.NORMAL,
    lineHeight: LINE_HEIGHTS.RELAXED,
    marginBottom: "1.5rem",
  },
  SMALL: {
    ...BODY_STYLES.SMALL,
    marginBottom: "0.75rem",
  },
} as const;

// リストスタイル
export const LIST_STYLES = {
  UNORDERED: {
    listStyleType: "disc",
    paddingLeft: "1.5rem",
    marginBottom: "1rem",
  },
  ORDERED: {
    listStyleType: "decimal",
    paddingLeft: "1.5rem",
    marginBottom: "1rem",
  },
  NONE: {
    listStyleType: "none",
    padding: "0",
  },
} as const;

// 引用スタイル
export const BLOCKQUOTE_STYLES = {
  DEFAULT: {
    fontSize: FONT_SIZES.LG,
    fontStyle: "italic",
    borderLeft: "4px solid #e5e7eb",
    paddingLeft: "1rem",
    marginLeft: "0",
    marginRight: "0",
    marginTop: "1rem",
    marginBottom: "1rem",
  },
} as const;

// コードスタイル
export const CODE_STYLES = {
  INLINE: {
    fontFamily: FONT_FAMILIES.MONO.join(", "),
    fontSize: "0.875em",
    backgroundColor: "#f3f4f6",
    padding: "0.25rem 0.375rem",
    borderRadius: "0.25rem",
  },
  BLOCK: {
    fontFamily: FONT_FAMILIES.MONO.join(", "),
    fontSize: FONT_SIZES.SM,
    backgroundColor: "#f8fafc",
    padding: "1rem",
    borderRadius: "0.375rem",
    overflow: "auto",
    whiteSpace: "pre-wrap",
  },
} as const;

// レスポンシブブレークポイント
export const RESPONSIVE_BREAKPOINTS = {
  SM: "640px",
  MD: "768px",
  LG: "1024px",
  XL: "1280px",
  "2XL": "1536px",
} as const;

// レスポンシブタイポグラフィ
export const RESPONSIVE_TYPOGRAPHY = {
  H1: {
    fontSize: FONT_SIZES["2XL"],
    [`@media (min-width: ${RESPONSIVE_BREAKPOINTS.SM})`]: {
      fontSize: FONT_SIZES["3XL"],
    },
    [`@media (min-width: ${RESPONSIVE_BREAKPOINTS.MD})`]: {
      fontSize: FONT_SIZES["4XL"],
    },
  },
  H2: {
    fontSize: FONT_SIZES.XL,
    [`@media (min-width: ${RESPONSIVE_BREAKPOINTS.SM})`]: {
      fontSize: FONT_SIZES["2XL"],
    },
    [`@media (min-width: ${RESPONSIVE_BREAKPOINTS.MD})`]: {
      fontSize: FONT_SIZES["3XL"],
    },
  },
  H3: {
    fontSize: FONT_SIZES.LG,
    [`@media (min-width: ${RESPONSIVE_BREAKPOINTS.SM})`]: {
      fontSize: FONT_SIZES.XL,
    },
    [`@media (min-width: ${RESPONSIVE_BREAKPOINTS.MD})`]: {
      fontSize: FONT_SIZES["2XL"],
    },
  },
} as const;

// 日本語タイポグラフィ固有の設定
export const JAPANESE_TYPOGRAPHY = {
  // 禁則処理
  WORD_BREAK: {
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  },
  // 文字詰め
  FONT_FEATURE_SETTINGS: {
    fontFeatureSettings: '"palt" 1',
  },
  // 縦書き
  VERTICAL_WRITING: {
    writingMode: "vertical-rl",
    textOrientation: "mixed",
  },
} as const;

// アクセシビリティ関連
export const ACCESSIBILITY_TYPOGRAPHY = {
  // 最小コントラスト比を満たすテキストサイズ
  MINIMUM_SIZES: {
    BODY: FONT_SIZES.BASE,
    CAPTION: FONT_SIZES.SM,
    LABEL: FONT_SIZES.SM,
  },
  // 読みやすさを向上させる設定
  READABILITY: {
    lineHeight: LINE_HEIGHTS.RELAXED,
    letterSpacing: LETTER_SPACINGS.NORMAL,
    wordSpacing: "0.16em",
  },
  // フォーカス時のスタイル
  FOCUS_STYLES: {
    outline: "2px solid #3b82f6",
    outlineOffset: "2px",
  },
} as const;

// エイリアス（後方互換性のため）
export const FONT_SIZE = {
  ...FONT_SIZES,
  MD: FONT_SIZES.BASE, // 後方互換性のため
};
export const FONT_WEIGHT = {
  ...FONT_WEIGHTS,
  SEMI_BOLD: FONT_WEIGHTS.SEMIBOLD, // 後方互換性のため
};

// 特別なフォントサイズ（既存コードで使用されている場合のため）
export const FONT_SIZE_SPECIAL = {
  TINY: FONT_SIZES.XS,
  SMALL: FONT_SIZES.SM,
  NORMAL: FONT_SIZES.BASE,
  LARGE: FONT_SIZES.LG,
  HUGE: FONT_SIZES["2XL"],
  // UserAvatarで使用される定義
  CAPTION: FONT_SIZES.XS,      // 12px
  BODY_SMALL: FONT_SIZES.SM,   // 14px
  BODY_LARGE: FONT_SIZES.LG,   // 18px
} as const;

// タイポグラフィバリアント（Material-UI風）
export const TYPOGRAPHY_VARIANTS = {
  h1: HEADING_STYLES.H1,
  h2: HEADING_STYLES.H2,
  h3: HEADING_STYLES.H3,
  h4: HEADING_STYLES.H4,
  h5: HEADING_STYLES.H5,
  h6: HEADING_STYLES.H6,
  body1: BODY_STYLES.MEDIUM,
  body2: BODY_STYLES.SMALL,
  subtitle1: {
    fontSize: FONT_SIZES.LG,
    fontWeight: FONT_WEIGHTS.NORMAL,
    lineHeight: LINE_HEIGHTS.NORMAL,
  },
  subtitle2: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    lineHeight: LINE_HEIGHTS.NORMAL,
  },
  caption: CAPTION_STYLES.MEDIUM,
  button: {
    fontSize: FONT_SIZES.SM,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    lineHeight: LINE_HEIGHTS.NORMAL,
    textTransform: TEXT_TRANSFORMS.UPPERCASE,
  },
  overline: {
    fontSize: FONT_SIZES.XS,
    fontWeight: FONT_WEIGHTS.NORMAL,
    lineHeight: LINE_HEIGHTS.NORMAL,
    textTransform: TEXT_TRANSFORMS.UPPERCASE,
    letterSpacing: LETTER_SPACINGS.WIDER,
  },
} as const;

// 型定義
export type FontSize = typeof FONT_SIZES[keyof typeof FONT_SIZES];
export type FontWeight = typeof FONT_WEIGHTS[keyof typeof FONT_WEIGHTS];
export type LineHeight = typeof LINE_HEIGHTS[keyof typeof LINE_HEIGHTS];
export type LetterSpacing = typeof LETTER_SPACINGS[keyof typeof LETTER_SPACINGS];
export type TextTransform = typeof TEXT_TRANSFORMS[keyof typeof TEXT_TRANSFORMS];
export type TextDecoration = typeof TEXT_DECORATIONS[keyof typeof TEXT_DECORATIONS];
export type TextAlignment = typeof TEXT_ALIGNMENTS[keyof typeof TEXT_ALIGNMENTS];