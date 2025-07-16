// UI寸法・レイアウト関連の定数定義

// 基本スペーシング
export const SPACING = {
  XS: "0.25rem", // 4px
  SM: "0.5rem", // 8px
  MD: "1rem", // 16px
  LG: "1.5rem", // 24px
  XL: "2rem", // 32px
  "2XL": "2.5rem", // 40px
  "3XL": "3rem", // 48px
  "4XL": "4rem", // 64px
  "5XL": "5rem", // 80px
} as const;

// パディング
export const PADDING = {
  XS: SPACING.XS,
  SM: SPACING.SM,
  MD: SPACING.MD,
  LG: SPACING.LG,
  XL: SPACING.XL,
  "2XL": SPACING["2XL"],
  "3XL": SPACING["3XL"],
  "4XL": SPACING["4XL"],
  "5XL": SPACING["5XL"],
} as const;

// マージン
export const MARGIN = {
  XS: SPACING.XS,
  SM: SPACING.SM,
  MD: SPACING.MD,
  LG: SPACING.LG,
  XL: SPACING.XL,
  "2XL": SPACING["2XL"],
  "3XL": SPACING["3XL"],
  "4XL": SPACING["4XL"],
  "5XL": SPACING["5XL"],
} as const;

// 境界線の太さ
export const BORDER_WIDTH = {
  NONE: "0",
  THIN: "1px",
  MEDIUM: "2px",
  THICK: "4px",
  EXTRA_THICK: "8px",
} as const;

// 境界線の半径
export const BORDER_RADIUS = {
  NONE: "0",
  SM: "0.125rem", // 2px
  MD: "0.25rem", // 4px
  LG: "0.5rem", // 8px
  XL: "0.75rem", // 12px
  "2XL": "1rem", // 16px
  "3XL": "1.5rem", // 24px
  FULL: "9999px",
} as const;

// 影の深さ
export const SHADOW = {
  NONE: "none",
  SM: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  MD: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  LG: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  XL: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "2XL": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  INNER: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
} as const;

// 幅の定義
export const WIDTH = {
  AUTO: "auto",
  FULL: "100%",
  SCREEN: "100vw",
  MIN: "min-content",
  MAX: "max-content",
  FIT: "fit-content",
  "1/2": "50%",
  "1/3": "33.333333%",
  "2/3": "66.666667%",
  "1/4": "25%",
  "3/4": "75%",
  "1/5": "20%",
  "2/5": "40%",
  "3/5": "60%",
  "4/5": "80%",
  "1/6": "16.666667%",
  "5/6": "83.333333%",
} as const;

// 高さの定義
export const HEIGHT = {
  AUTO: "auto",
  FULL: "100%",
  SCREEN: "100vh",
  MIN: "min-content",
  MAX: "max-content",
  FIT: "fit-content",
} as const;

// 最小幅
export const MIN_WIDTH = {
  XS: "20rem", // 320px
  SM: "24rem", // 384px
  MD: "28rem", // 448px
  LG: "32rem", // 512px
  XL: "36rem", // 576px
  "2XL": "42rem", // 672px
  "3XL": "48rem", // 768px
  "4XL": "56rem", // 896px
  "5XL": "64rem", // 1024px
  "6XL": "72rem", // 1152px
  "7XL": "80rem", // 1280px
} as const;

// 最大幅
export const MAX_WIDTH = {
  XS: "20rem", // 320px
  SM: "24rem", // 384px
  MD: "28rem", // 448px
  LG: "32rem", // 512px
  XL: "36rem", // 576px
  "2XL": "42rem", // 672px
  "3XL": "48rem", // 768px
  "4XL": "56rem", // 896px
  "5XL": "64rem", // 1024px
  "6XL": "72rem", // 1152px
  "7XL": "80rem", // 1280px
  FULL: "100%",
  SCREEN: "100vw",
  PROSE: "65ch",
} as const;

// 最小高さ
export const MIN_HEIGHT = {
  FULL: "100%",
  SCREEN: "100vh",
} as const;

// 最大高さ
export const MAX_HEIGHT = {
  FULL: "100%",
  SCREEN: "100vh",
} as const;

// Z-index
export const Z_INDEX = {
  HIDE: -1,
  AUTO: "auto",
  BASE: 0,
  DOCKED: 10,
  DROPDOWN: 1000,
  STICKY: 1020,
  BANNER: 1030,
  OVERLAY: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080,
  SYSTEM: 1090,
} as const;

// グリッドシステム
export const GRID = {
  COLUMNS: 12,
  GUTTER: SPACING.MD,
  CONTAINER_MAX_WIDTH: MAX_WIDTH["7XL"],
  BREAKPOINTS: {
    XS: "0px",
    SM: "576px",
    MD: "768px",
    LG: "992px",
    XL: "1200px",
    "2XL": "1400px",
  },
} as const;

// フレックスボックス
export const FLEX = {
  DIRECTION: {
    ROW: "row",
    ROW_REVERSE: "row-reverse",
    COLUMN: "column",
    COLUMN_REVERSE: "column-reverse",
  },
  WRAP: {
    WRAP: "wrap",
    NOWRAP: "nowrap",
    WRAP_REVERSE: "wrap-reverse",
  },
  JUSTIFY: {
    START: "flex-start",
    END: "flex-end",
    CENTER: "center",
    BETWEEN: "space-between",
    AROUND: "space-around",
    EVENLY: "space-evenly",
  },
  ALIGN: {
    START: "flex-start",
    END: "flex-end",
    CENTER: "center",
    BASELINE: "baseline",
    STRETCH: "stretch",
  },
  GROW: {
    GROW: 1,
    NO_GROW: 0,
  },
  SHRINK: {
    SHRINK: 1,
    NO_SHRINK: 0,
  },
} as const;

// コンポーネント固有の寸法
export const COMPONENT_DIMENSIONS = {
  // ヘッダー
  HEADER: {
    HEIGHT: "4rem", // 64px
    PADDING: PADDING.MD,
  },
  // サイドバー
  SIDEBAR: {
    WIDTH: "16rem", // 256px
    COLLAPSED_WIDTH: "4rem", // 64px
    PADDING: PADDING.MD,
  },
  // フッター
  FOOTER: {
    HEIGHT: "3rem", // 48px
    PADDING: PADDING.MD,
  },
  // カード
  CARD: {
    PADDING: PADDING.LG,
    BORDER_RADIUS: BORDER_RADIUS.LG,
    SHADOW: SHADOW.MD,
  },
  // ボタン
  BUTTON: {
    HEIGHT: {
      SM: "2rem", // 32px
      MD: "2.5rem", // 40px
      LG: "3rem", // 48px
    },
    PADDING: {
      SM: `${SPACING.SM} ${SPACING.MD}`,
      MD: `${SPACING.MD} ${SPACING.LG}`,
      LG: `${SPACING.LG} ${SPACING.XL}`,
    },
    BORDER_RADIUS: BORDER_RADIUS.MD,
  },
  // 入力フィールド
  INPUT: {
    HEIGHT: {
      SM: "2rem", // 32px
      MD: "2.5rem", // 40px
      LG: "3rem", // 48px
    },
    PADDING: `${SPACING.SM} ${SPACING.MD}`,
    BORDER_RADIUS: BORDER_RADIUS.MD,
    BORDER_WIDTH: BORDER_WIDTH.THIN,
  },
  // モーダル
  MODAL: {
    MAX_WIDTH: MAX_WIDTH["4XL"],
    PADDING: PADDING.XL,
    BORDER_RADIUS: BORDER_RADIUS.LG,
    SHADOW: SHADOW.XL,
  },
  // ドロップダウン
  DROPDOWN: {
    MIN_WIDTH: MIN_WIDTH.XS,
    MAX_WIDTH: MAX_WIDTH.SM,
    PADDING: PADDING.SM,
    BORDER_RADIUS: BORDER_RADIUS.MD,
    SHADOW: SHADOW.LG,
  },
  // タブ
  TAB: {
    HEIGHT: "3rem", // 48px
    PADDING: `${SPACING.MD} ${SPACING.LG}`,
    BORDER_RADIUS: BORDER_RADIUS.MD,
  },
  // テーブル
  TABLE: {
    ROW_HEIGHT: "3rem", // 48px
    HEADER_HEIGHT: "3.5rem", // 56px
    CELL_PADDING: `${SPACING.SM} ${SPACING.MD}`,
    BORDER_WIDTH: BORDER_WIDTH.THIN,
  },
  // パンくずリスト
  BREADCRUMB: {
    HEIGHT: "2rem", // 32px
    PADDING: PADDING.SM,
    SEPARATOR_MARGIN: SPACING.SM,
  },
  // バッジ
  BADGE: {
    HEIGHT: "1.5rem", // 24px
    PADDING: `${SPACING.XS} ${SPACING.SM}`,
    BORDER_RADIUS: BORDER_RADIUS.FULL,
  },
  // プログレスバー
  PROGRESS: {
    HEIGHT: "0.5rem", // 8px
    BORDER_RADIUS: BORDER_RADIUS.FULL,
  },
  // アバター
  AVATAR: {
    SIZE: {
      SM: "2rem", // 32px
      MD: "2.5rem", // 40px
      LG: "3rem", // 48px
      XL: "4rem", // 64px
    },
    BORDER_RADIUS: BORDER_RADIUS.FULL,
  },
  // チップ
  CHIP: {
    HEIGHT: "2rem", // 32px
    PADDING: `${SPACING.XS} ${SPACING.SM}`,
    BORDER_RADIUS: BORDER_RADIUS.FULL,
  },
  // スライダー
  SLIDER: {
    TRACK_HEIGHT: "0.25rem", // 4px
    THUMB_SIZE: "1rem", // 16px
    BORDER_RADIUS: BORDER_RADIUS.FULL,
  },
} as const;

// アニメーション用の寸法
export const ANIMATION_DIMENSIONS = {
  SLIDE_DISTANCE: "1rem", // 16px
  SCALE_FACTOR: 1.05,
  ROTATE_ANGLE: "180deg",
  OPACITY_LEVELS: {
    HIDDEN: 0,
    VISIBLE: 1,
    SEMI_TRANSPARENT: 0.5,
  },
} as const;

// レスポンシブ対応の寸法
export const RESPONSIVE_DIMENSIONS = {
  CONTAINER: {
    SM: "540px",
    MD: "720px",
    LG: "960px",
    XL: "1140px",
    "2XL": "1320px",
  },
  FONT_SIZE: {
    SM: "0.875rem", // 14px
    MD: "1rem", // 16px
    LG: "1.125rem", // 18px
  },
  SPACING: {
    SM: SPACING.SM,
    MD: SPACING.MD,
    LG: SPACING.LG,
  },
} as const;

// 印刷用の寸法
export const PRINT_DIMENSIONS = {
  PAGE: {
    A4: {
      WIDTH: "210mm",
      HEIGHT: "297mm",
    },
    A3: {
      WIDTH: "297mm",
      HEIGHT: "420mm",
    },
    LETTER: {
      WIDTH: "8.5in",
      HEIGHT: "11in",
    },
  },
  MARGIN: {
    TOP: "1in",
    RIGHT: "1in",
    BOTTOM: "1in",
    LEFT: "1in",
  },
} as const;

// 型定義
export type SpacingSize = typeof SPACING[keyof typeof SPACING];
export type BorderRadius = typeof BORDER_RADIUS[keyof typeof BORDER_RADIUS];
export type Shadow = typeof SHADOW[keyof typeof SHADOW];
export type ZIndex = typeof Z_INDEX[keyof typeof Z_INDEX];
export type FlexDirection = typeof FLEX.DIRECTION[keyof typeof FLEX.DIRECTION];
export type FlexJustify = typeof FLEX.JUSTIFY[keyof typeof FLEX.JUSTIFY];
export type FlexAlign = typeof FLEX.ALIGN[keyof typeof FLEX.ALIGN];