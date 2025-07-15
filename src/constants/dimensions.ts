/**
 * UI寸法関連の定数
 */

// 基本的なスペーシングシステム（8pxグリッドベース）
export const SPACING = {
  XXXS: 2,   // 0.25 * 8
  XXS: 4,    // 0.5 * 8
  XS: 8,     // 1 * 8
  SM: 12,    // 1.5 * 8
  MD: 16,    // 2 * 8
  LG: 24,    // 3 * 8
  XL: 32,    // 4 * 8
  XXL: 48,   // 6 * 8
  XXXL: 64,  // 8 * 8
} as const;

// ボーダー半径
export const BORDER_RADIUS = {
  XS: 2,
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  XXL: 24,
  FULL: 9999, // 完全な円形
} as const;

// コンポーネントサイズ
export const COMPONENT_SIZES = {
  // アバター
  AVATAR: {
    XS: 24,
    SM: 32,
    MD: 40,
    LG: 56,
    XL: 80,
    XXL: 120,
  },
  
  // アイコン
  ICON: {
    XS: 12,
    SM: 16,
    MD: 20,
    LG: 24,
    XL: 32,
    XXL: 48,
  },
  
  // ボタン
  BUTTON: {
    HEIGHT: {
      SM: 32,
      MD: 36,
      LG: 48,
    },
    MIN_WIDTH: 64,
  },
  
  // 入力フィールド
  INPUT: {
    HEIGHT: {
      SM: 32,
      MD: 40,
      LG: 48,
    },
  },
  
  // チップ
  CHIP: {
    HEIGHT: {
      SM: 24,
      MD: 32,
    },
  },
} as const;

// レイアウト寸法
export const LAYOUT = {
  // サイドバー
  SIDEBAR: {
    WIDTH: 280,
    COLLAPSED_WIDTH: 64,
  },
  
  // ヘッダー
  HEADER: {
    HEIGHT: 64,
    MOBILE_HEIGHT: 56,
  },
  
  // フッター
  FOOTER: {
    HEIGHT: 48,
  },
  
  // コンテンツ
  CONTENT: {
    MAX_WIDTH: 1200,
    PADDING: {
      MOBILE: 16,
      DESKTOP: 24,
    },
  },
  
  // ナビゲーション
  NAV: {
    HEIGHT: 48,
  },
} as const;

// カード寸法
export const CARD = {
  PADDING: {
    SM: 16,
    MD: 20,
    LG: 24,
  },
  MIN_HEIGHT: 120,
  BORDER_WIDTH: 1,
} as const;

// テーブル寸法
export const TABLE = {
  HEADER_HEIGHT: 60,
  ROW_HEIGHT: {
    COMPACT: 44,
    DEFAULT: 52,
    COMFORTABLE: 60,
  },
  CELL_PADDING: {
    COMPACT: 8,
    DEFAULT: 16,
  },
  MIN_WIDTH: 650,
} as const;

// プログレスバー
export const PROGRESS = {
  HEIGHT: {
    SM: 4,
    MD: 8,
    LG: 12,
  },
  CIRCULAR: {
    SM: 60,
    MD: 80,
    LG: 100,
  },
} as const;

// ダイアログ
export const DIALOG = {
  WIDTH: {
    XS: 320,
    SM: 400,
    MD: 600,
    LG: 800,
    XL: 1000,
  },
  PADDING: 24,
  ACTION_SPACING: 8,
} as const;

// スケルトン
export const SKELETON = {
  HEIGHT: {
    TEXT: 20,
    BUTTON: 36,
    AVATAR: 40,
    CARD: 200,
    TABLE_ROW: 52,
  },
  BORDER_RADIUS: 4,
} as const;

// フォーム
export const FORM = {
  FIELD_SPACING: 24,
  LABEL_MARGIN_BOTTOM: 8,
  HELPER_TEXT_MARGIN_TOP: 4,
  GROUP_SPACING: 32,
} as const;

// シャドウ（MUIのelevationに対応）
export const SHADOW = {
  ELEVATION: {
    0: 'none',
    1: '0px 2px 1px -1px rgba(0,0,0,0.2)',
    2: '0px 3px 1px -2px rgba(0,0,0,0.2)',
    3: '0px 3px 3px -2px rgba(0,0,0,0.2)',
    4: '0px 2px 4px -1px rgba(0,0,0,0.2)',
  },
} as const;

// ユーティリティ関数
export const spacing = (factor: number): number => factor * 8;
export const px = (value: number): string => `${value}px`;
export const responsive = (mobile: number, desktop: number) => ({
  xs: mobile,
  sm: desktop,
});

// 後方互換性のためのエクスポート
export const AVATAR_SIZES = COMPONENT_SIZES.AVATAR;
export const ICON_SIZES = COMPONENT_SIZES.ICON;
export const BUTTON_HEIGHTS = COMPONENT_SIZES.BUTTON.HEIGHT;
export const INPUT_HEIGHTS = COMPONENT_SIZES.INPUT.HEIGHT;
export const CHIP_HEIGHTS = COMPONENT_SIZES.CHIP.HEIGHT;
export const LAYOUT_DIMENSIONS = LAYOUT;
export const CARD_DIMENSIONS = CARD;
export const TABLE_DIMENSIONS = TABLE;
export const PROGRESS_DIMENSIONS = PROGRESS;
export const DIALOG_DIMENSIONS = DIALOG;
export const FORM_DIMENSIONS = FORM;

// よく使われる組み合わせ
export const COMMON_DIMENSIONS = {
  PAGE_PADDING: {
    MOBILE: { x: SPACING.MD, y: SPACING.MD },
    DESKTOP: { x: SPACING.LG, y: SPACING.LG },
  },
  CARD_SPACING: SPACING.MD,
  SECTION_SPACING: SPACING.XL,
  FORM_MAX_WIDTH: 600,
  SIDEBAR_ITEM_HEIGHT: 48,
} as const;