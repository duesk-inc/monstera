// 遅延・タイミング関連の定数定義

// 基本的な遅延時間（ミリ秒）
export const DELAYS = {
  INSTANT: 0,
  FAST: 100,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
  ULTRA_SLOW: 2000,
} as const;

// デバウンス遅延時間
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  INPUT: 500,
  VALIDATION: 300,
  AUTO_SAVE: 1000,
  RESIZE: 100,
  SCROLL: 100,
} as const;

// スロットル遅延時間
export const THROTTLE_DELAYS = {
  SCROLL: 16, // 60fps
  RESIZE: 16, // 60fps
  API_CALL: 500,
  CLICK: 300,
} as const;

// アニメーション遅延時間
export const ANIMATION_DELAYS = {
  FADE_IN: 150,
  FADE_OUT: 150,
  SLIDE_IN: 200,
  SLIDE_OUT: 200,
  BOUNCE: 300,
  SHAKE: 400,
  PULSE: 600,
} as const;

// UI遅延時間
export const UI_DELAYS = {
  TOOLTIP_SHOW: 500,
  TOOLTIP_HIDE: 100,
  DROPDOWN_SHOW: 100,
  DROPDOWN_HIDE: 150,
  MODAL_SHOW: 200,
  MODAL_HIDE: 200,
  ALERT_AUTO_HIDE: 5000,
  NOTIFICATION_AUTO_HIDE: 4000,
  SNACKBAR_AUTO_HIDE: 3000,
  THROTTLE: 300,
  DEBOUNCE: 500,
} as const;

// フォーム遅延時間
export const FORM_DELAYS = {
  VALIDATION: 300,
  SUBMIT: 500,
  AUTO_SAVE: 2000,
  FIELD_BLUR: 200,
  ERROR_SHOW: 100,
  SUCCESS_SHOW: 100,
} as const;

// API遅延時間
export const API_DELAYS = {
  REQUEST_TIMEOUT: 30000, // 30秒
  RETRY_DELAY: 1000,
  RETRY_BACKOFF: 2, // 指数バックオフ倍数
  POLLING_INTERVAL: 5000,
  CACHE_STALE_TIME: 300000, // 5分
  CACHE_GC_TIME: 600000, // 10分
} as const;

// 通知遅延時間
export const NOTIFICATION_DELAYS = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
  LOADING: 0, // 自動非表示しない
} as const;

// データ読み込み遅延時間
export const LOADING_DELAYS = {
  MIN_LOADING_TIME: 300, // 最小ローディング時間
  SKELETON_DELAY: 200, // スケルトン表示遅延
  LAZY_LOAD_DELAY: 100, // 遅延読み込み
  INFINITE_SCROLL_THRESHOLD: 100, // 無限スクロール閾値
} as const;

// 検索遅延時間
export const SEARCH_DELAYS = {
  QUERY_DEBOUNCE: 300,
  RESULTS_SHOW: 100,
  RESULTS_HIDE: 150,
  SUGGESTION_SHOW: 200,
  AUTOCOMPLETE_DELAY: 500,
} as const;

// ファイル操作遅延時間
export const FILE_DELAYS = {
  UPLOAD_PROGRESS_UPDATE: 100,
  DOWNLOAD_TIMEOUT: 60000, // 60秒
  PREVIEW_DELAY: 200,
  DRAG_DROP_DELAY: 100,
} as const;

// 状態同期遅延時間
export const SYNC_DELAYS = {
  AUTO_SYNC: 10000, // 10秒
  CONFLICT_RESOLUTION: 1000,
  OFFLINE_RETRY: 5000,
  HEARTBEAT: 30000, // 30秒
} as const;

// 分析・レポート遅延時間
export const ANALYTICS_DELAYS = {
  EVENT_BUFFER: 1000,
  BATCH_SEND: 5000,
  METRICS_UPDATE: 60000, // 1分
  PERFORMANCE_SAMPLE: 10000, // 10秒
} as const;

// バッチ処理遅延時間
export const BATCH_DELAYS = {
  SMALL_BATCH: 1000,
  MEDIUM_BATCH: 5000,
  LARGE_BATCH: 10000,
  PROCESS_CHUNK: 100,
} as const;

// 開発・デバッグ遅延時間
export const DEBUG_DELAYS = {
  MOCK_API_RESPONSE: 1000,
  SIMULATED_NETWORK: 2000,
  TEST_DELAY: 500,
  LOG_THROTTLE: 1000,
} as const;

// APIタイムアウト時間
export const API_TIMEOUTS = {
  SHORT: 5000,    // 短時間API用タイムアウト (5秒)
  DEFAULT: 30000, // 標準タイムアウト (30秒)
} as const;

// 時間閾値
export const TIME_THRESHOLDS = {
  IMMEDIATE: 3000, // 即時判定閾値 (3秒)
} as const;

// 遅延時間の計算ヘルパー
export const DELAY_HELPERS = {
  // 指数バックオフ計算
  exponentialBackoff: (attempt: number, baseDelay: number = 1000, maxDelay: number = 30000) => {
    return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  },
  
  // ジッター付き遅延
  withJitter: (delay: number, jitterRatio: number = 0.1) => {
    const jitter = delay * jitterRatio * (Math.random() - 0.5);
    return Math.max(0, delay + jitter);
  },
  
  // 段階的遅延
  staggered: (index: number, baseDelay: number = 100) => {
    return baseDelay * index;
  },
  
  // 条件付き遅延
  conditional: (condition: boolean, trueDelay: number, falseDelay: number = 0) => {
    return condition ? trueDelay : falseDelay;
  },
} as const;

// 型定義
export type DelayValue = typeof DELAYS[keyof typeof DELAYS];
export type DebounceDelay = typeof DEBOUNCE_DELAYS[keyof typeof DEBOUNCE_DELAYS];
export type ThrottleDelay = typeof THROTTLE_DELAYS[keyof typeof THROTTLE_DELAYS];
export type AnimationDelay = typeof ANIMATION_DELAYS[keyof typeof ANIMATION_DELAYS];
export type UIDelay = typeof UI_DELAYS[keyof typeof UI_DELAYS];
export type FormDelay = typeof FORM_DELAYS[keyof typeof FORM_DELAYS];
export type ApiDelay = typeof API_DELAYS[keyof typeof API_DELAYS];
export type NotificationDelay = typeof NOTIFICATION_DELAYS[keyof typeof NOTIFICATION_DELAYS];
export type LoadingDelay = typeof LOADING_DELAYS[keyof typeof LOADING_DELAYS];
export type SearchDelay = typeof SEARCH_DELAYS[keyof typeof SEARCH_DELAYS];
export type FileDelay = typeof FILE_DELAYS[keyof typeof FILE_DELAYS];
export type SyncDelay = typeof SYNC_DELAYS[keyof typeof SYNC_DELAYS];
export type AnalyticsDelay = typeof ANALYTICS_DELAYS[keyof typeof ANALYTICS_DELAYS];
export type BatchDelay = typeof BATCH_DELAYS[keyof typeof BATCH_DELAYS];
export type DebugDelay = typeof DEBUG_DELAYS[keyof typeof DEBUG_DELAYS];
export type ApiTimeouts = typeof API_TIMEOUTS[keyof typeof API_TIMEOUTS];
export type TimeThresholds = typeof TIME_THRESHOLDS[keyof typeof TIME_THRESHOLDS];