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

// 請求計算タイプ
export const BILLING_CALCULATION_TYPE = {
  HOURLY: "hourly",
  FIXED: "fixed",
  MONTHLY: "monthly",
  DAILY: "daily",
} as const;

// 請求計算タイプラベル
export const BILLING_CALCULATION_TYPE_LABELS = {
  [BILLING_CALCULATION_TYPE.HOURLY]: "時間単価",
  [BILLING_CALCULATION_TYPE.FIXED]: "固定金額",
  [BILLING_CALCULATION_TYPE.MONTHLY]: "月額",
  [BILLING_CALCULATION_TYPE.DAILY]: "日額",
} as const;

// 請求計算タイプ説明
export const BILLING_CALCULATION_TYPE_DESCRIPTIONS = {
  [BILLING_CALCULATION_TYPE.HOURLY]: "稼働時間に基づいて計算",
  [BILLING_CALCULATION_TYPE.FIXED]: "固定金額で計算",
  [BILLING_CALCULATION_TYPE.MONTHLY]: "月額固定で計算",
  [BILLING_CALCULATION_TYPE.DAILY]: "日額単価で計算",
} as const;

// 請求ステータス
export const BILLING_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;

// 請求ステータスラベル
export const BILLING_STATUS_LABELS = {
  [BILLING_STATUS.DRAFT]: "下書き",
  [BILLING_STATUS.PENDING]: "承認待ち",
  [BILLING_STATUS.APPROVED]: "承認済み",
  [BILLING_STATUS.SENT]: "送信済み",
  [BILLING_STATUS.PAID]: "支払い済み",
  [BILLING_STATUS.OVERDUE]: "期限切れ",
  [BILLING_STATUS.CANCELLED]: "キャンセル",
} as const;

// 請求ステータス色
export const BILLING_STATUS_COLORS = {
  [BILLING_STATUS.DRAFT]: "#6b7280",
  [BILLING_STATUS.PENDING]: "#f59e0b",
  [BILLING_STATUS.APPROVED]: "#10b981",
  [BILLING_STATUS.SENT]: "#3b82f6",
  [BILLING_STATUS.PAID]: "#059669",
  [BILLING_STATUS.OVERDUE]: "#ef4444",
  [BILLING_STATUS.CANCELLED]: "#9ca3af",
} as const;

// freee接続ステータス
export const FREEE_CONNECTION_STATUS = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
  PENDING: "pending",
} as const;

// freee接続ステータス（古い命名のエイリアス）
export const FREE_CONNECTION_STATUS = FREEE_CONNECTION_STATUS;

// freee接続ステータスラベル
export const FREEE_CONNECTION_STATUS_LABELS = {
  [FREEE_CONNECTION_STATUS.CONNECTED]: "接続済み",
  [FREEE_CONNECTION_STATUS.DISCONNECTED]: "未接続",
  [FREEE_CONNECTION_STATUS.ERROR]: "エラー",
  [FREEE_CONNECTION_STATUS.PENDING]: "接続中",
} as const;

// アクティビティタイプ
export const ACTIVITY_TYPE = {
  DEVELOPMENT: "development",
  DESIGN: "design",
  MEETING: "meeting",
  REVIEW: "review",
  TESTING: "testing",
  DOCUMENTATION: "documentation",
  OTHER: "other",
} as const;

// アクティビティタイプラベル
export const ACTIVITY_TYPE_LABELS = {
  [ACTIVITY_TYPE.DEVELOPMENT]: "開発",
  [ACTIVITY_TYPE.DESIGN]: "設計",
  [ACTIVITY_TYPE.MEETING]: "会議",
  [ACTIVITY_TYPE.REVIEW]: "レビュー",
  [ACTIVITY_TYPE.TESTING]: "テスト",
  [ACTIVITY_TYPE.DOCUMENTATION]: "ドキュメント作成",
  [ACTIVITY_TYPE.OTHER]: "その他",
} as const;

// プロジェクトグループステータス
export const PROJECT_GROUP_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  COMPLETED: "completed",
  SUSPENDED: "suspended",
} as const;

// スケジュールステータス
export const SCHEDULE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

// スケジュールステータスラベル
export const SCHEDULE_STATUS_LABELS = {
  [SCHEDULE_STATUS.ACTIVE]: "有効",
  [SCHEDULE_STATUS.INACTIVE]: "無効",
  [SCHEDULE_STATUS.COMPLETED]: "完了",
  [SCHEDULE_STATUS.FAILED]: "失敗",
} as const;

// Cronプリセット
export const CRON_PRESETS = {
  DAILY: "0 9 * * *",
  WEEKLY: "0 9 * * 1",
  MONTHLY: "0 9 1 * *",
  QUARTERLY: "0 9 1 */3 *",
} as const;

// チャート設定
export const CHART_CONFIG = {
  COLORS: {
    PRIMARY: "#3b82f6",
    SECONDARY: "#10b981",
    ACCENT: "#f59e0b",
    DANGER: "#ef4444",
    WARNING: "#f59e0b",
    SUCCESS: "#10b981",
    INFO: "#3b82f6",
  },
  ANIMATION: {
    DURATION: 300,
    EASING: "ease-in-out",
  },
  GRID: {
    SHOW: true,
    COLOR: "#e5e7eb",
    WIDTH: 1,
  },
} as const;

// キャッシュ設定
export const CACHE_CONFIG = {
  TTL: {
    SHORT: 5 * 60 * 1000,    // 5分
    MEDIUM: 30 * 60 * 1000,  // 30分
    LONG: 60 * 60 * 1000,    // 1時間
  },
  KEYS: {
    DASHBOARD: "accounting:dashboard",
    PROJECT_GROUPS: "accounting:project-groups",
    BILLING_HISTORY: "accounting:billing-history",
    FREEE_CONFIG: "accounting:freee-config",
  },
} as const;

// バリデーションルール
export const VALIDATION_RULES = {
  PROJECT_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-_]+$/,
  },
  BILLING_AMOUNT: {
    MIN: 0,
    MAX: 999999999,
  },
  HOURLY_RATE: {
    MIN: 100,
    MAX: 50000,
  },
  DESCRIPTION: {
    MAX_LENGTH: 1000,
  },
} as const;

// バリデーションメッセージ
export const VALIDATION_MESSAGES = {
  PROJECT_NAME_REQUIRED: "プロジェクト名は必須です",
  PROJECT_NAME_TOO_SHORT: "プロジェクト名は1文字以上入力してください",
  PROJECT_NAME_TOO_LONG: "プロジェクト名は100文字以内で入力してください",
  PROJECT_NAME_INVALID: "プロジェクト名に使用できない文字が含まれています",
  BILLING_AMOUNT_REQUIRED: "請求金額は必須です",
  BILLING_AMOUNT_MIN: "請求金額は0円以上で入力してください",
  BILLING_AMOUNT_MAX: "請求金額は999,999,999円以下で入力してください",
  HOURLY_RATE_MIN: "時間単価は100円以上で入力してください",
  HOURLY_RATE_MAX: "時間単価は50,000円以下で入力してください",
  DESCRIPTION_TOO_LONG: "説明は1000文字以内で入力してください",
} as const;

// エラーコード
export const ACCOUNTING_ERROR_CODES = {
  // 認証エラー
  UNAUTHORIZED: "AUTH_001",
  FORBIDDEN: "AUTH_002",
  
  // バリデーションエラー
  VALIDATION_FAILED: "VAL_001",
  INVALID_DATE_RANGE: "VAL_002",
  INVALID_AMOUNT: "VAL_003",
  
  // ビジネスロジックエラー
  PROJECT_NOT_FOUND: "BIZ_001",
  BILLING_ALREADY_PROCESSED: "BIZ_002",
  FREEE_NOT_CONNECTED: "BIZ_003",
  INSUFFICIENT_DATA: "BIZ_004",
  
  // システムエラー
  DATABASE_ERROR: "SYS_001",
  EXTERNAL_API_ERROR: "SYS_002",
  TIMEOUT_ERROR: "SYS_003",
} as const;

// 型定義エクスポート
export type InvoiceStatus = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];
export type BatchJobStatus = typeof BATCH_JOB_STATUS[keyof typeof BATCH_JOB_STATUS];
export type FreeSyncStatus = typeof FREEE_SYNC_STATUS[keyof typeof FREEE_SYNC_STATUS];
export type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS];
export type BillingCalculationType = typeof BILLING_CALCULATION_TYPE[keyof typeof BILLING_CALCULATION_TYPE];
export type BillingStatus = typeof BILLING_STATUS[keyof typeof BILLING_STATUS];
export type FreeeConnectionStatus = typeof FREEE_CONNECTION_STATUS[keyof typeof FREEE_CONNECTION_STATUS];
export type ActivityType = typeof ACTIVITY_TYPE[keyof typeof ACTIVITY_TYPE];