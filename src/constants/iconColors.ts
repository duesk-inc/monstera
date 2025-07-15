/**
 * アイコンカラーの一元管理
 * アプリケーション全体で使用するアイコンの色を統一
 */

export const ICON_COLORS = {
  // 基本アクション
  DEFAULT: 'inherit' as const,
  PRIMARY: 'primary' as const,
  SECONDARY: 'inherit' as const,
  
  // 削除・危険な操作
  DELETE: 'inherit' as const,
  DANGER: 'error' as const,
  
  // ステータス
  SUCCESS: 'success' as const,
  WARNING: 'warning' as const,
  ERROR: 'error' as const,
  INFO: 'info' as const,
} as const;

/**
 * アイコンカラーの型定義
 */
export type IconColor = typeof ICON_COLORS[keyof typeof ICON_COLORS];

/**
 * デフォルトのアイコンカラー設定
 */
export const DEFAULT_ICON_COLORS = {
  edit: ICON_COLORS.PRIMARY,
  delete: ICON_COLORS.DELETE,
  add: ICON_COLORS.PRIMARY,
  save: ICON_COLORS.PRIMARY,
  cancel: ICON_COLORS.SECONDARY,
  close: ICON_COLORS.SECONDARY,
} as const;