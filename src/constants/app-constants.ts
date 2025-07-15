/**
 * アプリケーション定数の統合
 * 
 * このファイルは、すべての定数を統合した
 * 単一のオブジェクトを提供します。
 */

import * as auth from './auth';
import * as delays from './delays';
import * as network from './network';
import * as pagination from './pagination';
import * as ui from './ui';
import * as dimensions from './dimensions';
import * as typography from './typography';
import * as businessRules from './business-rules';

/**
 * アプリケーション全体の定数
 * 
 * 使用例:
 * ```typescript
 * import { APP_CONSTANTS } from '@/constants';
 * 
 * const borderRadius = APP_CONSTANTS.DIMENSIONS.BORDER_RADIUS.MD;
 * const fontWeight = APP_CONSTANTS.TYPOGRAPHY.FONT_WEIGHTS.BOLD;
 * ```
 */
export const APP_CONSTANTS = {
  // 認証関連
  AUTH: auth,
  
  // 遅延・タイマー関連
  DELAYS: delays.DELAYS,
  
  // ネットワーク関連
  NETWORK: network,
  
  // ページネーション
  PAGINATION: pagination.PAGINATION,
  
  // UI関連
  UI: ui,
  
  // 寸法・サイズ関連
  DIMENSIONS: {
    BORDER_RADIUS: dimensions.BORDER_RADIUS,
    AVATAR_SIZES: dimensions.AVATAR_SIZES,
    ICON_SIZES: dimensions.ICON_SIZES,
    BUTTON_HEIGHTS: dimensions.BUTTON_HEIGHTS,
    INPUT_HEIGHTS: dimensions.INPUT_HEIGHTS,
    SPACING: dimensions.SPACING,
    LAYOUT: dimensions.LAYOUT_DIMENSIONS,
    CARD: dimensions.CARD_DIMENSIONS,
    TABLE: dimensions.TABLE_DIMENSIONS,
    PROGRESS: dimensions.PROGRESS_DIMENSIONS,
    DIALOG: dimensions.DIALOG_DIMENSIONS,
    FORM: dimensions.FORM_DIMENSIONS,
  },
  
  // タイポグラフィ関連
  TYPOGRAPHY: {
    FONT_WEIGHTS: typography.FONT_WEIGHTS,
    SEMANTIC_WEIGHTS: typography.SEMANTIC_FONT_WEIGHTS,
    FONT_SIZES: typography.FONT_SIZES,
    SPECIAL_SIZES: typography.SPECIAL_FONT_SIZES,
    LINE_HEIGHTS: typography.LINE_HEIGHTS,
    LETTER_SPACING: typography.LETTER_SPACING,
    VARIANTS: typography.TYPOGRAPHY_VARIANTS,
  },
  
  // ビジネスルール関連
  BUSINESS: {
    FILE_UPLOAD: businessRules.FILE_UPLOAD,
    VALIDATION: businessRules.FORM_VALIDATION,
    LIMITS: businessRules.BUSINESS_LIMITS,
    PERCENTAGE: businessRules.PERCENTAGE,
    DATE_TIME: businessRules.DATE_TIME,
    DISPLAY: businessRules.DISPLAY_LIMITS,
    STATUS: businessRules.STATUS_THRESHOLDS,
    CURRENCY: businessRules.CURRENCY,
  },
  
  // ユーティリティ関数
  UTILS: {
    px: dimensions.px,
    spacing: dimensions.spacing,
    responsive: dimensions.responsive,
    remToPx: typography.remToPx,
    pxToRem: typography.pxToRem,
    bytesToMB: businessRules.bytesToMB,
    mbToBytes: businessRules.mbToBytes,
    calculatePercentage: businessRules.calculatePercentage,
    getStatusByPercentage: businessRules.getStatusByPercentage,
  },
} as const;

// 型定義
export type AppConstants = typeof APP_CONSTANTS;