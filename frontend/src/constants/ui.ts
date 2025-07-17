// UI関連の定数定義

// 色の定義
export const COLORS = {
  PRIMARY: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
  },
  SECONDARY: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  SUCCESS: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
  },
  WARNING: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },
  ERROR: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
  },
  GRAY: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
} as const;

// アイコンサイズ
export const ICON_SIZES = {
  XS: "12px",
  SM: "16px",
  MD: "20px",
  LG: "24px",
  XL: "32px",
  "2XL": "48px",
  "3XL": "64px",
} as const;

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
  "6XL": "3.75rem", // 60px
} as const;

// フォントウェイト
export const FONT_WEIGHTS = {
  THIN: 100,
  LIGHT: 300,
  NORMAL: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 700,
  EXTRABOLD: 800,
  BLACK: 900,
} as const;

// 行の高さ
export const LINE_HEIGHTS = {
  NONE: 1,
  TIGHT: 1.25,
  SNUG: 1.375,
  NORMAL: 1.5,
  RELAXED: 1.625,
  LOOSE: 2,
} as const;

// レイアウト定数
export const LAYOUT = {
  HEADER_HEIGHT: "64px",
  SIDEBAR_WIDTH: "256px",
  SIDEBAR_COLLAPSED_WIDTH: "64px",
  FOOTER_HEIGHT: "48px",
  CONTAINER_MAX_WIDTH: "1200px",
  CONTENT_PADDING: "24px",
  SECTION_SPACING: "32px",
} as const;

// ブレークポイント
export const BREAKPOINTS = {
  XS: "0px",
  SM: "576px",
  MD: "768px",
  LG: "992px",
  XL: "1200px",
  "2XL": "1400px",
} as const;

// アニメーション
export const ANIMATIONS = {
  DURATION: {
    FAST: "150ms",
    NORMAL: "300ms",
    SLOW: "500ms",
  },
  EASING: {
    EASE_IN: "cubic-bezier(0.4, 0, 1, 1)",
    EASE_OUT: "cubic-bezier(0, 0, 0.2, 1)",
    EASE_IN_OUT: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

// 状態色
export const STATE_COLORS = {
  ACTIVE: COLORS.PRIMARY[500],
  INACTIVE: COLORS.GRAY[400],
  DISABLED: COLORS.GRAY[300],
  HOVER: COLORS.PRIMARY[600],
  FOCUS: COLORS.PRIMARY[500],
  SELECTED: COLORS.PRIMARY[100],
} as const;

// セマンティックカラー
export const SEMANTIC_COLORS = {
  TEXT: {
    PRIMARY: COLORS.GRAY[900],
    SECONDARY: COLORS.GRAY[600],
    DISABLED: COLORS.GRAY[400],
    INVERSE: "#ffffff",
  },
  BACKGROUND: {
    PRIMARY: "#ffffff",
    SECONDARY: COLORS.GRAY[50],
    TERTIARY: COLORS.GRAY[100],
    INVERSE: COLORS.GRAY[900],
  },
  BORDER: {
    PRIMARY: COLORS.GRAY[200],
    SECONDARY: COLORS.GRAY[300],
    FOCUS: COLORS.PRIMARY[500],
    ERROR: COLORS.ERROR[500],
  },
} as const;

// 影の設定
export const SHADOWS = {
  NONE: "none",
  SM: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  MD: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  LG: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  XL: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "2XL": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  INNER: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
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

// 境界線の幅
export const BORDER_WIDTH = {
  NONE: "0",
  THIN: "1px",
  MEDIUM: "2px",
  THICK: "4px",
} as const;

// 透明度
export const OPACITY = {
  TRANSPARENT: 0,
  SLIGHT: 0.05,
  LIGHT: 0.1,
  MEDIUM: 0.2,
  HEAVY: 0.3,
  STRONG: 0.4,
  INTENSE: 0.5,
  OPAQUE: 1,
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
  GUTTER: "1rem",
  CONTAINER_PADDING: "1rem",
} as const;

// 入力フィールドの状態
export const INPUT_STATES = {
  DEFAULT: "default",
  FOCUS: "focus",
  DISABLED: "disabled",
  ERROR: "error",
  SUCCESS: "success",
  WARNING: "warning",
} as const;

// 入力フィールドの状態色
export const INPUT_STATE_COLORS = {
  [INPUT_STATES.DEFAULT]: COLORS.GRAY[300],
  [INPUT_STATES.FOCUS]: COLORS.PRIMARY[500],
  [INPUT_STATES.DISABLED]: COLORS.GRAY[200],
  [INPUT_STATES.ERROR]: COLORS.ERROR[500],
  [INPUT_STATES.SUCCESS]: COLORS.SUCCESS[500],
  [INPUT_STATES.WARNING]: COLORS.WARNING[500],
} as const;

// ボタンのバリアント
export const BUTTON_VARIANTS = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
  OUTLINE: "outline",
  GHOST: "ghost",
  LINK: "link",
  DESTRUCTIVE: "destructive",
} as const;

// ボタンサイズ
export const BUTTON_SIZES = {
  SM: "sm",
  MD: "md",
  LG: "lg",
  XL: "xl",
} as const;

// ローディング状態
export const LOADING_STATES = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
} as const;

// 通知タイプ
export const NOTIFICATION_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
} as const;

// 通知タイプ色
export const NOTIFICATION_TYPE_COLORS = {
  [NOTIFICATION_TYPES.INFO]: COLORS.PRIMARY[500],
  [NOTIFICATION_TYPES.SUCCESS]: COLORS.SUCCESS[500],
  [NOTIFICATION_TYPES.WARNING]: COLORS.WARNING[500],
  [NOTIFICATION_TYPES.ERROR]: COLORS.ERROR[500],
} as const;

// テーブルの設定
export const TABLE_CONFIG = {
  ROW_HEIGHT: "48px",
  HEADER_HEIGHT: "56px",
  CELL_PADDING: "12px 16px",
  BORDER_COLOR: COLORS.GRAY[200],
  HOVER_COLOR: COLORS.GRAY[50],
  SELECTED_COLOR: COLORS.PRIMARY[50],
} as const;

// フォームの設定
export const FORM_CONFIG = {
  LABEL_MARGIN: "0 0 8px 0",
  INPUT_MARGIN: "0 0 16px 0",
  ERROR_MARGIN: "4px 0 0 0",
  FIELD_SPACING: "16px",
  SECTION_SPACING: "24px",
} as const;

// カードの設定
export const CARD_CONFIG = {
  PADDING: "24px",
  BORDER_RADIUS: BORDER_RADIUS.LG,
  SHADOW: SHADOWS.MD,
  BORDER_COLOR: COLORS.GRAY[200],
  BACKGROUND_COLOR: "#ffffff",
} as const;

// オートコンプリートの設定
export const AUTOCOMPLETE = {
  DISPLAY_LIMIT: 10, // 表示する項目数の上限
  MIN_CHARACTERS: 1, // オートコンプリートを開始する最小文字数
  DEBOUNCE_DELAY: 300, // デバウンス遅延時間（ミリ秒）
  MAX_OPTIONS: 50, // オプションの最大数
} as const;

// タイムピッカーの設定
export const TIME_PICKER = {
  HOUR_FORMAT: "24", // 24時間表示または12時間表示
  MINUTE_STEP: 15, // 分の刻み
  DEFAULT_TIME: "09:00", // デフォルト時刻
  MIN_TIME: "00:00", // 最小時刻
  MAX_TIME: "23:59", // 最大時刻
  DISPLAY_FORMAT: "HH:mm", // 表示フォーマット
} as const;

// 型定義
export type Color = typeof COLORS;
export type IconSize = typeof ICON_SIZES[keyof typeof ICON_SIZES];
export type FontSize = typeof FONT_SIZES[keyof typeof FONT_SIZES];
export type FontWeight = typeof FONT_WEIGHTS[keyof typeof FONT_WEIGHTS];
export type LineHeight = typeof LINE_HEIGHTS[keyof typeof LINE_HEIGHTS];
export type Shadow = typeof SHADOWS[keyof typeof SHADOWS];
export type BorderRadius = typeof BORDER_RADIUS[keyof typeof BORDER_RADIUS];
export type BorderWidth = typeof BORDER_WIDTH[keyof typeof BORDER_WIDTH];
export type Opacity = typeof OPACITY[keyof typeof OPACITY];
export type ZIndex = typeof Z_INDEX[keyof typeof Z_INDEX];
export type InputState = typeof INPUT_STATES[keyof typeof INPUT_STATES];
export type ButtonVariant = typeof BUTTON_VARIANTS[keyof typeof BUTTON_VARIANTS];
export type ButtonSize = typeof BUTTON_SIZES[keyof typeof BUTTON_SIZES];
export type LoadingState = typeof LOADING_STATES[keyof typeof LOADING_STATES];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type AutocompleteConfig = typeof AUTOCOMPLETE[keyof typeof AUTOCOMPLETE];