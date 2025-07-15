/**
 * UI関連の定数
 */

// ページネーション
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

// オートコンプリート
export const AUTOCOMPLETE = {
  DISPLAY_LIMIT: 50,
  MIN_INPUT_LENGTH: 1,
  DEBOUNCE_MS: 300,
} as const;

// Toast通知
export const TOAST = {
  DURATION_MS: 5000,
  MAX_TOASTS: 3,
  POSITION: 'bottom-left' as const,
} as const;

// サーキュラープログレス
export const CIRCULAR_PROGRESS = {
  SIZE: {
    SMALL: 60,
    MEDIUM: 80,
    LARGE: 100,
  },
  THICKNESS: 4,
} as const;

// タイムピッカー
export const TIME_PICKER = {
  STEP_MINUTES: 5,              // 5分刻み
  STEP_SECONDS: 300,            // 秒単位（5分）
} as const;

// 遅延・アニメーション
export const DELAYS = {
  REDIRECT_MS: 3000,            // リダイレクト遅延（3秒）
  DEBOUNCE_MS: 500,            // デバウンス遅延（0.5秒）
  TRANSITION_MS: 300,          // トランジション時間（0.3秒）
} as const;

// テーブル
export const TABLE = {
  MIN_WIDTH: 650,
  HEADER_HEIGHT: 60,
  ROW_HEIGHT: 52,
} as const;

// フォーム
export const FORM = {
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// レイアウト
export const LAYOUT = {
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 64,
  FOOTER_HEIGHT: 48,
  CONTENT_MAX_WIDTH: 1200,
} as const;