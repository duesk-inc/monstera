/**
 * 遅延・タイムアウト関連の定数
 */

// API関連のタイムアウト
export const API_TIMEOUTS = {
  DEFAULT: 20000,              // デフォルトAPIタイムアウト（20秒）
  SHORT: 15000,                // 短いタイムアウト（15秒）
  LONG: 30000,                 // 長いタイムアウト（30秒）
  UPLOAD: 120000,              // ファイルアップロード（2分）
  DOWNLOAD: 60000,             // ファイルダウンロード（1分）
} as const;

// UI遅延
export const UI_DELAYS = {
  REDIRECT: 3000,              // リダイレクト遅延（3秒）
  LOGIN_WAIT: 2000,            // ログイン待機（2秒）
  DEBOUNCE: 500,               // デバウンス（0.5秒）
  THROTTLE: 1000,              // スロットル（1秒）
  TRANSITION: 300,             // トランジション（0.3秒）
  SNACKBAR_CLOSE: 100,         // スナックバー閉じる（0.1秒）
  ERROR_DISPLAY: 5000,         // エラー表示時間（5秒）
} as const;

// ポーリング間隔
export const POLLING_INTERVALS = {
  AUTH_CHECK: 60000,           // 認証チェック（1分）
  NOTIFICATION: 30000,         // 通知チェック（30秒）
  STATUS_UPDATE: 5000,         // ステータス更新（5秒）
} as const;

// リトライ遅延
export const RETRY_DELAYS = {
  MIN: 1000,                   // 最小リトライ遅延（1秒）
  MAX: 30000,                  // 最大リトライ遅延（30秒）
  JITTER: 1000,                // ジッター（1秒）
} as const;

// 時間差判定
export const TIME_THRESHOLDS = {
  IMMEDIATE: 3000,             // 即座と判定する閾値（3秒）
  RECENT: 300000,              // 最近と判定する閾値（5分）
  STALE: 3600000,              // 古いと判定する閾値（1時間）
} as const;