// 経理機能の定数定義

import {
  BillingStatus,
  BillingCalculationType,
  ScheduleStatus,
  BatchJobStatus,
  FreeSyncStatus,
  FreeConnectionStatus,
  AccountingPermission,
  ExportFormat,
} from "../types/accounting";

// ========== ステータス定数 ==========

/**
 * 請求ステータス定数
 */
export const BILLING_STATUS = {
  DRAFT: "draft" as BillingStatus,
  PREVIEW: "preview" as BillingStatus,
  PROCESSING: "processing" as BillingStatus,
  COMPLETED: "completed" as BillingStatus,
  FAILED: "failed" as BillingStatus,
  CANCELLED: "cancelled" as BillingStatus,
} as const;

/**
 * 請求ステータスラベル
 */
export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  draft: "下書き",
  preview: "プレビュー",
  processing: "処理中",
  completed: "完了",
  failed: "失敗",
  cancelled: "キャンセル",
};

/**
 * 請求ステータス色定義
 */
export const BILLING_STATUS_COLORS: Record<BillingStatus, string> = {
  draft: "#9e9e9e", // グレー
  preview: "#2196f3", // ブルー
  processing: "#ff9800", // オレンジ
  completed: "#4caf50", // グリーン
  failed: "#f44336", // レッド
  cancelled: "#607d8b", // ブルーグレー
};

/**
 * 請求計算タイプ定数
 */
export const BILLING_CALCULATION_TYPE = {
  FIXED: "fixed" as BillingCalculationType,
  VARIABLE_UPPER_LOWER: "variable_upper_lower" as BillingCalculationType,
  VARIABLE_MIDDLE: "variable_middle" as BillingCalculationType,
} as const;

/**
 * 請求計算タイプラベル
 */
export const BILLING_CALCULATION_TYPE_LABELS: Record<
  BillingCalculationType,
  string
> = {
  fixed: "固定",
  variable_upper_lower: "上下割",
  variable_middle: "中間値",
};

/**
 * 請求計算タイプ説明
 */
export const BILLING_CALCULATION_TYPE_DESCRIPTIONS: Record<
  BillingCalculationType,
  string
> = {
  fixed: "固定金額で請求します",
  variable_upper_lower: "上限・下限を設定して時間に応じて請求します",
  variable_middle: "中間値を基準として時間に応じて請求します",
};

/**
 * スケジュールステータス定数
 */
export const SCHEDULE_STATUS = {
  ACTIVE: "active" as ScheduleStatus,
  INACTIVE: "inactive" as ScheduleStatus,
  COMPLETED: "completed" as ScheduleStatus,
  FAILED: "failed" as ScheduleStatus,
} as const;

/**
 * スケジュールステータスラベル
 */
export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  active: "アクティブ",
  inactive: "非アクティブ",
  completed: "完了",
  failed: "失敗",
};

/**
 * バッチジョブステータス定数
 */
export const BATCH_JOB_STATUS = {
  PENDING: "pending" as BatchJobStatus,
  RUNNING: "running" as BatchJobStatus,
  COMPLETED: "completed" as BatchJobStatus,
  FAILED: "failed" as BatchJobStatus,
  CANCELLED: "cancelled" as BatchJobStatus,
} as const;

/**
 * バッチジョブステータスラベル
 */
export const BATCH_JOB_STATUS_LABELS: Record<BatchJobStatus, string> = {
  pending: "待機中",
  running: "実行中",
  completed: "完了",
  failed: "失敗",
  cancelled: "キャンセル",
};

/**
 * freee同期ステータス定数
 */
export const FREEE_SYNC_STATUS = {
  PENDING: "pending" as FreeSyncStatus,
  IN_PROGRESS: "in_progress" as FreeSyncStatus,
  COMPLETED: "completed" as FreeSyncStatus,
  FAILED: "failed" as FreeSyncStatus,
} as const;

/**
 * freee同期ステータスラベル
 */
export const FREEE_SYNC_STATUS_LABELS: Record<FreeSyncStatus, string> = {
  pending: "待機中",
  in_progress: "進行中",
  completed: "完了",
  failed: "失敗",
};

/**
 * freee接続ステータス定数
 */
export const FREEE_CONNECTION_STATUS = {
  CONNECTED: "connected" as FreeConnectionStatus,
  DISCONNECTED: "disconnected" as FreeConnectionStatus,
  EXPIRED: "expired" as FreeConnectionStatus,
  ERROR: "error" as FreeConnectionStatus,
} as const;

/**
 * freee接続ステータスラベル
 */
export const FREEE_CONNECTION_STATUS_LABELS: Record<
  FreeConnectionStatus,
  string
> = {
  connected: "接続済み",
  disconnected: "未接続",
  expired: "期限切れ",
  error: "エラー",
};

/**
 * freee接続ステータス色定義
 */
export const FREEE_CONNECTION_STATUS_COLORS: Record<
  FreeConnectionStatus,
  string
> = {
  connected: "#4caf50", // グリーン
  disconnected: "#9e9e9e", // グレー
  expired: "#ff9800", // オレンジ
  error: "#f44336", // レッド
};

// ========== 権限定数 ==========

/**
 * 経理権限定数
 */
export const ACCOUNTING_PERMISSION = {
  READ: "accounting:read" as AccountingPermission,
  WRITE: "accounting:write" as AccountingPermission,
  ADMIN: "accounting:admin" as AccountingPermission,
  BILLING_READ: "billing:read" as AccountingPermission,
  BILLING_WRITE: "billing:write" as AccountingPermission,
  BILLING_PROCESS: "billing:process" as AccountingPermission,
  FREEE_READ: "freee:read" as AccountingPermission,
  FREEE_WRITE: "freee:write" as AccountingPermission,
  FREEE_SYNC: "freee:sync" as AccountingPermission,
} as const;

/**
 * 経理権限ラベル
 */
export const ACCOUNTING_PERMISSION_LABELS: Record<
  AccountingPermission,
  string
> = {
  "accounting:read": "経理閲覧",
  "accounting:write": "経理編集",
  "accounting:admin": "経理管理",
  "billing:read": "請求閲覧",
  "billing:write": "請求編集",
  "billing:process": "請求処理",
  "freee:read": "freee閲覧",
  "freee:write": "freee編集",
  "freee:sync": "freee同期",
};

// ========== エクスポート形式定数 ==========

/**
 * エクスポート形式定数
 */
export const EXPORT_FORMAT = {
  CSV: "csv" as ExportFormat,
  XLSX: "xlsx" as ExportFormat,
  PDF: "pdf" as ExportFormat,
} as const;

/**
 * エクスポート形式ラベル
 */
export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: "CSV",
  xlsx: "Excel",
  pdf: "PDF",
};

// ========== UI設定定数 ==========

/**
 * ページネーション設定
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_VISIBLE_PAGES: 5,
} as const;

/**
 * テーブル設定
 */
export const TABLE_CONFIG = {
  DEFAULT_SORT_ORDER: "desc" as const,
  ROW_HEIGHT: 52,
  HEADER_HEIGHT: 56,
  STICKY_HEADER: true,
  SHOW_ROW_HOVER: true,
} as const;

/**
 * フォーム設定
 */
export const FORM_CONFIG = {
  DEBOUNCE_DELAY: 300, // ms
  AUTO_SAVE_DELAY: 2000, // ms
  VALIDATION_DELAY: 500, // ms
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ["image/jpeg", "image/png", "application/pdf"],
} as const;

/**
 * チャート設定
 */
export const CHART_CONFIG = {
  DEFAULT_HEIGHT: 400,
  COLORS: [
    "#1976d2", // ブルー
    "#388e3c", // グリーン
    "#f57c00", // オレンジ
    "#d32f2f", // レッド
    "#7b1fa2", // パープル
    "#455a64", // ブルーグレー
    "#c2185b", // ピンク
    "#689f38", // ライトグリーン
  ],
  ANIMATION_DURATION: 750,
  TOOLTIP_FORMAT: {
    CURRENCY: "¥{value:,.0f}",
    PERCENTAGE: "{value:.1f}%",
    COUNT: "{value:,}件",
  },
} as const;

// ========== バリデーション定数 ==========

/**
 * バリデーション規則
 */
export const VALIDATION_RULES = {
  PROJECT_GROUP_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    REQUIRED: true,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  AMOUNT: {
    MIN: 0,
    MAX: 99999999, // 9999万円
  },
  WORK_HOURS: {
    MIN: 0,
    MAX: 24,
    DECIMAL_PLACES: 1,
  },
  SCHEDULE_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    REQUIRED: true,
  },
  CRON_EXPRESSION: {
    REQUIRED: true,
    PATTERN:
      /^(\*|[0-9,\-\/\*]+)\s+(\*|[0-9,\-\/\*]+)\s+(\*|[0-9,\-\/\*]+)\s+(\*|[0-9,\-\/\*]+)\s+(\*|[0-9,\-\/\*]+)$/,
  },
} as const;

/**
 * バリデーションメッセージ
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: "必須項目です",
  MIN_LENGTH: (min: number) => `${min}文字以上で入力してください`,
  MAX_LENGTH: (max: number) => `${max}文字以内で入力してください`,
  MIN_VALUE: (min: number) => `${min}以上の値を入力してください`,
  MAX_VALUE: (max: number) => `${max}以下の値を入力してください`,
  INVALID_FORMAT: "形式が正しくありません",
  INVALID_CRON: "Cron式の形式が正しくありません",
  DUPLICATE_NAME: "同じ名前が既に存在します",
  INVALID_DATE: "有効な日付を入力してください",
  FUTURE_DATE_REQUIRED: "未来の日付を入力してください",
} as const;

// ========== API設定定数 ==========

/**
 * APIエンドポイント
 */
export const API_ENDPOINTS = {
  // ダッシュボード
  DASHBOARD: "/api/v1/accounting/dashboard",
  MONTHLY_TREND: "/api/v1/accounting/dashboard/monthly-trend",
  CLIENT_RANKING: "/api/v1/accounting/dashboard/client-ranking",

  // プロジェクトグループ
  PROJECT_GROUPS: "/api/v1/accounting/project-groups",
  PROJECT_GROUP_DETAIL: (id: string) =>
    `/api/v1/accounting/project-groups/${id}`,

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
  SCHEDULE_EXECUTE: (id: string) =>
    `/api/v1/accounting/schedules/${id}/execute`,

  // バッチジョブ
  BATCH_JOBS: "/api/v1/accounting/batch-jobs",
  BATCH_JOB_DETAIL: (id: string) => `/api/v1/accounting/batch-jobs/${id}`,
  BATCH_JOB_CANCEL: (id: string) =>
    `/api/v1/accounting/batch-jobs/${id}/cancel`,

  // エクスポート
  EXPORT_BILLING: "/api/v1/accounting/export/billing",
  EXPORT_PROJECT_GROUPS: "/api/v1/accounting/export/project-groups",
  EXPORT_FREEE_DATA: "/api/v1/accounting/export/freee-data",
} as const;

/**
 * HTTP設定
 */
export const HTTP_CONFIG = {
  TIMEOUT: 30000, // 30秒
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000, // 1秒
  UPLOAD_TIMEOUT: 120000, // 2分
} as const;

// ========== 日付・時間設定 ==========

/**
 * 日付フォーマット
 */
export const DATE_FORMAT = {
  DISPLAY: "YYYY年MM月DD日",
  DISPLAY_SHORT: "MM/DD",
  DISPLAY_MONTH: "YYYY年MM月",
  ISO: "YYYY-MM-DD",
  ISO_DATETIME: "YYYY-MM-DDTHH:mm:ss",
  TIME: "HH:mm",
  MONTH_PICKER: "YYYY-MM",
} as const;

/**
 * Cron式プリセット
 */
export const CRON_PRESETS = {
  DAILY_9AM: {
    expression: "0 9 * * *",
    label: "毎日 9:00",
  },
  WEEKDAYS_9AM: {
    expression: "0 9 * * 1-5",
    label: "平日 9:00",
  },
  MONTHLY_1ST_9AM: {
    expression: "0 9 1 * *",
    label: "毎月1日 9:00",
  },
  WEEKLY_MONDAY_9AM: {
    expression: "0 9 * * 1",
    label: "毎週月曜 9:00",
  },
} as const;

// ========== デフォルト値定数 ==========

/**
 * デフォルト値
 */
export const DEFAULT_VALUES = {
  WORK_HOURS_PER_DAY: 8,
  WORK_DAYS_PER_MONTH: 20,
  BILLING_CALCULATION_TYPE: BILLING_CALCULATION_TYPE.FIXED,
  PAGINATION_LIMIT: PAGINATION.DEFAULT_LIMIT,
  CHART_HEIGHT: CHART_CONFIG.DEFAULT_HEIGHT,
  DEBOUNCE_DELAY: FORM_CONFIG.DEBOUNCE_DELAY,
} as const;

// ========== アクティビティタイプ定数 ==========

/**
 * アクティビティタイプ
 */
export const ACTIVITY_TYPE = {
  BILLING_CREATED: "billing_created",
  BILLING_COMPLETED: "billing_completed",
  FREEE_SYNC: "freee_sync",
  PROJECT_GROUP_CREATED: "project_group_created",
  PROJECT_GROUP_UPDATED: "project_group_updated",
  PROJECT_GROUP_DELETED: "project_group_deleted",
  SCHEDULE_CREATED: "schedule_created",
  SCHEDULE_EXECUTED: "schedule_executed",
  BATCH_JOB_STARTED: "batch_job_started",
  BATCH_JOB_COMPLETED: "batch_job_completed",
} as const;

/**
 * アクティビティタイプラベル
 */
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  [ACTIVITY_TYPE.BILLING_CREATED]: "請求作成",
  [ACTIVITY_TYPE.BILLING_COMPLETED]: "請求完了",
  [ACTIVITY_TYPE.FREEE_SYNC]: "freee同期",
  [ACTIVITY_TYPE.PROJECT_GROUP_CREATED]: "プロジェクトグループ作成",
  [ACTIVITY_TYPE.PROJECT_GROUP_UPDATED]: "プロジェクトグループ更新",
  [ACTIVITY_TYPE.PROJECT_GROUP_DELETED]: "プロジェクトグループ削除",
  [ACTIVITY_TYPE.SCHEDULE_CREATED]: "スケジュール作成",
  [ACTIVITY_TYPE.SCHEDULE_EXECUTED]: "スケジュール実行",
  [ACTIVITY_TYPE.BATCH_JOB_STARTED]: "バッチジョブ開始",
  [ACTIVITY_TYPE.BATCH_JOB_COMPLETED]: "バッチジョブ完了",
};

/**
 * アクティビティタイプアイコン
 */
export const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  [ACTIVITY_TYPE.BILLING_CREATED]: "receipt",
  [ACTIVITY_TYPE.BILLING_COMPLETED]: "check_circle",
  [ACTIVITY_TYPE.FREEE_SYNC]: "sync",
  [ACTIVITY_TYPE.PROJECT_GROUP_CREATED]: "group_add",
  [ACTIVITY_TYPE.PROJECT_GROUP_UPDATED]: "edit",
  [ACTIVITY_TYPE.PROJECT_GROUP_DELETED]: "delete",
  [ACTIVITY_TYPE.SCHEDULE_CREATED]: "schedule",
  [ACTIVITY_TYPE.SCHEDULE_EXECUTED]: "play_arrow",
  [ACTIVITY_TYPE.BATCH_JOB_STARTED]: "play_arrow",
  [ACTIVITY_TYPE.BATCH_JOB_COMPLETED]: "done",
};

// ========== 通知設定 ==========

/**
 * 通知タイプ
 */
export const NOTIFICATION_TYPE = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
} as const;

/**
 * 通知継続時間
 */
export const NOTIFICATION_DURATION = {
  SHORT: 3000, // 3秒
  MEDIUM: 5000, // 5秒
  LONG: 8000, // 8秒
  PERSISTENT: 0, // 手動で閉じるまで
} as const;

// ========== 請求計算設定 ==========

/**
 * 請求計算設定
 */
export const BILLING_CALCULATION = {
  // 上下割の計算時のデフォルト比率
  UPPER_LOWER_RATIO: {
    UPPER: 0.6, // 上限時間の60%
    LOWER: 0.4, // 下限時間の40%
  },
  // 中間値計算時の基準時間
  MIDDLE_BASE_HOURS: 160, // 月160時間を基準
  // 精算時の許容誤差（円）
  CALCULATION_TOLERANCE: 1,
} as const;

// ========== freee設定 ==========

/**
 * freee設定
 */
export const FREEE_CONFIG = {
  // 同期間隔（分）
  SYNC_INTERVAL: 60,
  // バッチサイズ
  BATCH_SIZE: 100,
  // リトライ回数
  MAX_RETRY_COUNT: 3,
  // タイムアウト（秒）
  API_TIMEOUT: 30,
} as const;

// ========== キャッシュ設定 ==========

/**
 * キャッシュ設定
 */
export const CACHE_CONFIG = {
  // キャッシュ有効期限（分）
  DASHBOARD_TTL: 5,
  PROJECT_GROUPS_TTL: 10,
  BILLING_PREVIEW_TTL: 1,
  FREEE_DATA_TTL: 15,
  // キャッシュキー
  KEYS: {
    DASHBOARD: "accounting:dashboard",
    PROJECT_GROUPS: "accounting:project-groups",
    BILLING_PREVIEW: "accounting:billing-preview",
    FREEE_CONFIG: "accounting:freee-config",
  },
} as const;

// ========== UI状態管理 ==========

/**
 * ダイアログタイプ
 */
export const DIALOG_TYPE = {
  PROJECT_GROUP_CREATE: "project_group_create",
  PROJECT_GROUP_EDIT: "project_group_edit",
  PROJECT_GROUP_DELETE: "project_group_delete",
  BILLING_PREVIEW: "billing_preview",
  BILLING_PROCESS: "billing_process",
  SCHEDULE_CREATE: "schedule_create",
  SCHEDULE_EDIT: "schedule_edit",
  FREEE_CONNECT: "freee_connect",
  EXPORT_DATA: "export_data",
} as const;

/**
 * 画面モード
 */
export const VIEW_MODE = {
  LIST: "list",
  GRID: "grid",
  TABLE: "table",
  CALENDAR: "calendar",
} as const;

/**
 * フィルター設定
 */
export const FILTER_CONFIG = {
  // デフォルトの日付範囲（月）
  DEFAULT_DATE_RANGE_MONTHS: 3,
  // 最大日付範囲（月）
  MAX_DATE_RANGE_MONTHS: 12,
  // デバウンス時間（ms）
  SEARCH_DEBOUNCE: 300,
} as const;

// ========== エラーコード定数 ==========

/**
 * 経理エラーコード定数
 */
export const ACCOUNTING_ERROR_CODES = {
  // 権限エラー
  PERMISSION_DENIED: "PERMISSION_DENIED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",

  // データエラー
  DATA_INCONSISTENCY: "DATA_INCONSISTENCY",
  DATA_NOT_FOUND: "DATA_NOT_FOUND",

  // freee連携エラー
  FREEE_AUTH_REQUIRED: "FREEE_AUTH_REQUIRED",
  FREEE_SYNC_FAILED: "FREEE_SYNC_FAILED",
  FREEE_RATE_LIMIT: "FREEE_RATE_LIMIT",
  FREEE_SYNC_IN_PROGRESS: "FREEE_SYNC_IN_PROGRESS",

  // 請求処理エラー
  BILLING_ALREADY_PROCESSED: "BILLING_ALREADY_PROCESSED",
  BILLING_PREVIEW_EXPIRED: "BILLING_PREVIEW_EXPIRED",
  BILLING_VALIDATION_FAILED: "BILLING_VALIDATION_FAILED",

  // プロジェクトグループエラー
  PROJECT_GROUP_NOT_FOUND: "PROJECT_GROUP_NOT_FOUND",
  PROJECT_GROUP_HAS_PROJECTS: "PROJECT_GROUP_HAS_PROJECTS",

  // スケジュールエラー
  SCHEDULE_CONFLICT: "SCHEDULE_CONFLICT",
  SCHEDULE_EXECUTION_FAILED: "SCHEDULE_EXECUTION_FAILED",

  // バッチ処理エラー
  BATCH_JOB_FAILED: "BATCH_JOB_FAILED",
  BATCH_JOB_TIMEOUT: "BATCH_JOB_TIMEOUT",

  // その他
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

/**
 * エラーメッセージ定義
 */
export const ERROR_MESSAGES = {
  // 権限エラー
  PERMISSION_DENIED: "この操作を実行する権限がありません",
  INSUFFICIENT_PERMISSIONS: "必要な権限が不足しています",

  // データエラー
  DATA_INCONSISTENCY: "データに不整合が発生しました",
  DATA_NOT_FOUND: "データが見つかりません",

  // freee連携エラー
  FREEE_AUTH_REQUIRED: "freee連携の認証が必要です",
  FREEE_SYNC_FAILED: "freee同期に失敗しました",
  FREEE_RATE_LIMIT:
    "freee APIのレート制限に達しました。しばらく待ってから再試行してください",
  FREEE_SYNC_IN_PROGRESS: "freee同期が進行中です",

  // 請求処理エラー
  BILLING_ALREADY_PROCESSED: "この請求は既に処理されています",
  BILLING_PREVIEW_EXPIRED:
    "請求プレビューの有効期限が切れました。再度プレビューを生成してください",
  BILLING_VALIDATION_FAILED: "請求データの検証に失敗しました",

  // プロジェクトグループエラー
  PROJECT_GROUP_NOT_FOUND: "プロジェクトグループが見つかりません",
  PROJECT_GROUP_HAS_PROJECTS: "プロジェクトが登録されているため削除できません",

  // スケジュールエラー
  SCHEDULE_CONFLICT: "スケジュールが重複しています",
  SCHEDULE_EXECUTION_FAILED: "スケジュールの実行に失敗しました",

  // バッチ処理エラー
  BATCH_JOB_FAILED: "バッチ処理に失敗しました",
  BATCH_JOB_TIMEOUT: "バッチ処理がタイムアウトしました",

  // その他
  UNKNOWN_ERROR: "予期しないエラーが発生しました",
} as const;

// ========== バリデーション定数（追加分） ==========

/**
 * プロジェクトグループ名の最大長
 */
export const MAX_PROJECT_GROUP_NAME_LENGTH = 100;

/**
 * 説明の最大長
 */
export const MAX_DESCRIPTION_LENGTH = 500;

/**
 * 時給の最大値
 */
export const MAX_HOURLY_RATE = 50000;

/**
 * 備考の最大長
 */
export const MAX_NOTES_LENGTH = 1000;

/**
 * プロジェクトグループステータス定数
 */
export const PROJECT_GROUP_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
