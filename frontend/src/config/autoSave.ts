/**
 * 自動保存機能の設定
 */

export const AUTO_SAVE_CONFIG = {
  // 自動保存のデバウンス時間（ミリ秒）
  DEBOUNCE_DELAY: 3000,
  
  // 定期的な自動保存の間隔（ミリ秒）
  INTERVAL: 60000,
  
  // 下書きの有効期限（時間）
  EXPIRY_HOURS: 24,
  
  // ローカルストレージのキー
  STORAGE_KEY: 'expense_draft',
  
  // 自動保存を有効にするフォーム
  ENABLED_FORMS: ['expense_create'],
  
  // 自動保存から除外するフィールド
  EXCLUDED_FIELDS: ['version'],
  
  // 最小保存間隔（ミリ秒）- 連続保存を防ぐ
  MIN_SAVE_INTERVAL: 1000,
  
  // 最大下書きサイズ（バイト）
  MAX_DRAFT_SIZE: 1048576, // 1MB
  
  // 自動保存の通知設定
  NOTIFICATIONS: {
    SHOW_SAVE_SUCCESS: true,
    SHOW_SAVE_ERROR: false,
    SHOW_RESTORE_PROMPT: true,
  },
  
  // デバッグモード
  DEBUG: process.env.NODE_ENV === 'development',
} as const;

/**
 * 自動保存のステータス
 */
export enum AutoSaveStatus {
  IDLE = 'idle',
  SAVING = 'saving',
  SAVED = 'saved',
  ERROR = 'error',
}

/**
 * 自動保存のイベント名
 */
export const AUTO_SAVE_EVENTS = {
  SAVE_START: 'autosave:start',
  SAVE_SUCCESS: 'autosave:success',
  SAVE_ERROR: 'autosave:error',
  DRAFT_LOADED: 'autosave:draft_loaded',
  DRAFT_CLEARED: 'autosave:draft_cleared',
} as const;