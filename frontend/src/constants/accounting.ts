// 経理機能のAPI定数定義

// API エンドポイント定数
export const API_ENDPOINTS = {
  // ダッシュボード
  DASHBOARD: "/api/v1/accounting/dashboard",
  MONTHLY_TREND: "/api/v1/accounting/dashboard/monthly-trend",
  CLIENT_RANKING: "/api/v1/accounting/dashboard/client-ranking",

  // プロジェクトグループ
  PROJECT_GROUPS: "/api/v1/accounting/project-groups",
  PROJECT_GROUP_DETAIL: (id: string) => `/api/v1/accounting/project-groups/${id}`,

  // 請求処理
  BILLING_PREVIEW: "/api/v1/accounting/billing/preview",
  BILLING_PREVIEWS: "/api/v1/accounting/billing/previews",
  BILLING_PROCESS: "/api/v1/accounting/billing/process",
  BILLING_SCHEDULE: "/api/v1/accounting/billing/schedule",
  BILLING_HISTORY: "/api/v1/accounting/billing/history",

  // freee連携
  FREEE_AUTH_URL: "/api/v1/accounting/freee/auth-url",
  FREEE_CALLBACK: "/api/v1/accounting/freee/callback",
  FREEE_DISCONNECT: "/api/v1/accounting/freee/disconnect",
  FREEE_SYNC: "/api/v1/accounting/freee/sync",
  FREEE_PARTNERS: "/api/v1/accounting/freee/partners",
  FREEE_INVOICES: "/api/v1/accounting/freee/invoices",

  // スケジュール
  SCHEDULES: "/api/v1/accounting/schedules",
  SCHEDULE_DETAIL: (id: string) => `/api/v1/accounting/schedules/${id}`,
  SCHEDULE_EXECUTE: (id: string) => `/api/v1/accounting/schedules/${id}/execute`,

  // バッチジョブ
  BATCH_JOBS: "/api/v1/accounting/batch-jobs",
  BATCH_JOB_DETAIL: (id: string) => `/api/v1/accounting/batch-jobs/${id}`,
  BATCH_JOB_CANCEL: (id: string) => `/api/v1/accounting/batch-jobs/${id}/cancel`,

  // エクスポート
  EXPORT_BILLING: "/api/v1/accounting/export/billing",
  EXPORT_PROJECT_GROUPS: "/api/v1/accounting/export/project-groups",
  EXPORT_FREEE_DATA: "/api/v1/accounting/export/freee-data",
} as const;

// 請求書ステータス
export const INVOICE_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;

// 請求書ステータス表示名
export const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUS.DRAFT]: "下書き",
  [INVOICE_STATUS.PENDING]: "承認待ち",
  [INVOICE_STATUS.SENT]: "送信済み",
  [INVOICE_STATUS.PAID]: "支払い済み",
  [INVOICE_STATUS.OVERDUE]: "期限切れ",
  [INVOICE_STATUS.CANCELLED]: "キャンセル",
} as const;

// バッチジョブステータス
export const BATCH_JOB_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

// バッチジョブステータス表示名
export const BATCH_JOB_STATUS_LABELS = {
  [BATCH_JOB_STATUS.PENDING]: "待機中",
  [BATCH_JOB_STATUS.RUNNING]: "実行中",
  [BATCH_JOB_STATUS.COMPLETED]: "完了",
  [BATCH_JOB_STATUS.FAILED]: "失敗",
  [BATCH_JOB_STATUS.CANCELLED]: "キャンセル",
} as const;

// freee同期ステータス
export const FREEE_SYNC_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

// freee同期ステータス表示名
export const FREEE_SYNC_STATUS_LABELS = {
  [FREEE_SYNC_STATUS.PENDING]: "待機中",
  [FREEE_SYNC_STATUS.RUNNING]: "実行中",
  [FREEE_SYNC_STATUS.COMPLETED]: "完了",
  [FREEE_SYNC_STATUS.FAILED]: "失敗",
} as const;

// エクスポートフォーマット
export const EXPORT_FORMATS = {
  CSV: "csv",
  XLSX: "xlsx",
  PDF: "pdf",
} as const;

// エクスポートフォーマット表示名
export const EXPORT_FORMAT_LABELS = {
  [EXPORT_FORMATS.CSV]: "CSV",
  [EXPORT_FORMATS.XLSX]: "Excel",
  [EXPORT_FORMATS.PDF]: "PDF",
} as const;

// ページサイズ選択肢
export const PAGE_SIZES = [10, 20, 50, 100] as const;

// デフォルトページサイズ
export const DEFAULT_PAGE_SIZE = 20;

// API リクエストタイムアウト（ミリ秒）
export const API_TIMEOUT = 30000;

// キャッシュ有効期間（ミリ秒）
export const CACHE_DURATIONS = {
  DASHBOARD: 5 * 60 * 1000, // 5分
  PROJECT_GROUPS: 10 * 60 * 1000, // 10分
  FREEE_CONFIG: 60 * 60 * 1000, // 1時間
} as const;

// 請求月の選択肢を生成するための設定
export const BILLING_MONTH_RANGE = {
  PAST_MONTHS: 12, // 過去12ヶ月
  FUTURE_MONTHS: 3, // 未来3ヶ月
} as const;

// 通貨フォーマット
export const CURRENCY_FORMAT = {
  LOCALE: "ja-JP",
  CURRENCY: "JPY",
  MINIMUM_FRACTION_DIGITS: 0,
  MAXIMUM_FRACTION_DIGITS: 0,
} as const;

// 日付フォーマット
export const DATE_FORMAT = {
  DISPLAY: "YYYY/MM/DD",
  API: "YYYY-MM-DD",
  MONTH: "YYYY/MM",
} as const;

// バリデーション設定
export const VALIDATION = {
  PROJECT_GROUP_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  BILLING_AMOUNT: {
    MIN: 0,
    MAX: 999999999,
  },
  EXPORT_RECORD_LIMIT: {
    MIN: 1,
    MAX: 10000,
  },
} as const;

// エラーメッセージ
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "ネットワークエラーが発生しました。時間をおいて再度お試しください。",
  UNAUTHORIZED: "認証が必要です。再度ログインしてください。",
  FORBIDDEN: "この操作を実行する権限がありません。",
  NOT_FOUND: "指定されたリソースが見つかりません。",
  VALIDATION_ERROR: "入力内容に問題があります。",
  SERVER_ERROR: "サーバーエラーが発生しました。管理者にお問い合わせください。",
  TIMEOUT: "処理がタイムアウトしました。時間をおいて再度お試しください。",
  FREEE_CONNECTION_ERROR: "freee APIとの接続に失敗しました。",
  EXPORT_ERROR: "エクスポート処理に失敗しました。",
} as const;

// 成功メッセージ
export const SUCCESS_MESSAGES = {
  PROJECT_GROUP_CREATED: "プロジェクトグループを作成しました。",
  PROJECT_GROUP_UPDATED: "プロジェクトグループを更新しました。",
  PROJECT_GROUP_DELETED: "プロジェクトグループを削除しました。",
  BILLING_PROCESSED: "請求処理を完了しました。",
  BILLING_SCHEDULED: "請求処理をスケジュールしました。",
  FREEE_CONNECTED: "freeeとの連携を設定しました。",
  FREEE_DISCONNECTED: "freeeとの連携を解除しました。",
  FREEE_SYNCED: "freeeとの同期を完了しました。",
  EXPORT_COMPLETED: "エクスポート処理を完了しました。",
} as const;

// 確認メッセージ
export const CONFIRM_MESSAGES = {
  DELETE_PROJECT_GROUP: "このプロジェクトグループを削除しますか？",
  PROCESS_BILLING: "請求処理を実行しますか？",
  CANCEL_BATCH_JOB: "バッチジョブをキャンセルしますか？",
  DISCONNECT_FREEE: "freeeとの連携を解除しますか？",
  BULK_DELETE: "選択されたアイテムを削除しますか？",
} as const;

// 型定義エクスポート
export type InvoiceStatus = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];
export type BatchJobStatus = typeof BATCH_JOB_STATUS[keyof typeof BATCH_JOB_STATUS];
export type FreeSyncStatus = typeof FREEE_SYNC_STATUS[keyof typeof FREEE_SYNC_STATUS];
export type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS];