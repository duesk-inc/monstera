// 週報関連の定数定義

// 週報ステータス
export const WEEKLY_REPORT_STATUS = {
  NOT_SUBMITTED: "not_submitted",
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  RETURNED: "returned",
} as const;

// 週報ステータス表示名
export const WEEKLY_REPORT_STATUS_LABELS = {
  [WEEKLY_REPORT_STATUS.NOT_SUBMITTED]: "未提出",
  [WEEKLY_REPORT_STATUS.DRAFT]: "下書き",
  [WEEKLY_REPORT_STATUS.SUBMITTED]: "提出済み",
  [WEEKLY_REPORT_STATUS.APPROVED]: "承認済み",
  [WEEKLY_REPORT_STATUS.REJECTED]: "却下",
  [WEEKLY_REPORT_STATUS.RETURNED]: "差し戻し",
} as const;

// 週報ステータス色
export const WEEKLY_REPORT_STATUS_COLORS = {
  [WEEKLY_REPORT_STATUS.NOT_SUBMITTED]: "#9ca3af", // gray-400
  [WEEKLY_REPORT_STATUS.DRAFT]: "#6b7280", // gray
  [WEEKLY_REPORT_STATUS.SUBMITTED]: "#3b82f6", // blue
  [WEEKLY_REPORT_STATUS.APPROVED]: "#22c55e", // green
  [WEEKLY_REPORT_STATUS.REJECTED]: "#ef4444", // red
  [WEEKLY_REPORT_STATUS.RETURNED]: "#f59e0b", // amber
} as const;

// 勤務時間の制限
export const WORK_TIME_LIMITS = {
  MIN_HOURS: 0,
  MAX_HOURS: 24,
  MIN_MINUTES: 0,
  MAX_MINUTES: 59,
  MAX_DAILY_HOURS: 16,
  MAX_WEEKLY_HOURS: 80,
} as const;

// 週報の日付範囲
export const WEEKLY_REPORT_DATE_RANGE = {
  START_DAY: 1, // 月曜日
  END_DAY: 7, // 日曜日
  DAYS_IN_WEEK: 7,
} as const;

// 曜日の定義
export const WEEKDAYS = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 0,
} as const;

// 曜日表示名
export const WEEKDAY_LABELS = {
  [WEEKDAYS.MONDAY]: "月",
  [WEEKDAYS.TUESDAY]: "火",
  [WEEKDAYS.WEDNESDAY]: "水",
  [WEEKDAYS.THURSDAY]: "木",
  [WEEKDAYS.FRIDAY]: "金",
  [WEEKDAYS.SATURDAY]: "土",
  [WEEKDAYS.SUNDAY]: "日",
} as const;

// 曜日の完全表示名
export const WEEKDAY_FULL_LABELS = {
  [WEEKDAYS.MONDAY]: "月曜日",
  [WEEKDAYS.TUESDAY]: "火曜日",
  [WEEKDAYS.WEDNESDAY]: "水曜日",
  [WEEKDAYS.THURSDAY]: "木曜日",
  [WEEKDAYS.FRIDAY]: "金曜日",
  [WEEKDAYS.SATURDAY]: "土曜日",
  [WEEKDAYS.SUNDAY]: "日曜日",
} as const;

// 週報の種類
export const REPORT_TYPES = {
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  PROJECT: "project",
} as const;

// 週報の種類表示名
export const REPORT_TYPE_LABELS = {
  [REPORT_TYPES.WEEKLY]: "週報",
  [REPORT_TYPES.MONTHLY]: "月報",
  [REPORT_TYPES.PROJECT]: "プロジェクト報告",
} as const;

// 勤務形態
export const WORK_TYPES = {
  OFFICE: "office",
  REMOTE: "remote",
  HYBRID: "hybrid",
  BUSINESS_TRIP: "business_trip",
  LEAVE: "leave",
} as const;

// 勤務形態表示名
export const WORK_TYPE_LABELS = {
  [WORK_TYPES.OFFICE]: "出社",
  [WORK_TYPES.REMOTE]: "リモート",
  [WORK_TYPES.HYBRID]: "ハイブリッド",
  [WORK_TYPES.BUSINESS_TRIP]: "出張",
  [WORK_TYPES.LEAVE]: "休暇",
} as const;

// 勤務形態色
export const WORK_TYPE_COLORS = {
  [WORK_TYPES.OFFICE]: "#3b82f6", // blue
  [WORK_TYPES.REMOTE]: "#22c55e", // green
  [WORK_TYPES.HYBRID]: "#f59e0b", // amber
  [WORK_TYPES.BUSINESS_TRIP]: "#8b5cf6", // violet
  [WORK_TYPES.LEAVE]: "#6b7280", // gray
} as const;

// 作業カテゴリ
export const WORK_CATEGORIES = {
  DEVELOPMENT: "development",
  DESIGN: "design",
  TESTING: "testing",
  DOCUMENTATION: "documentation",
  MEETING: "meeting",
  RESEARCH: "research",
  MAINTENANCE: "maintenance",
  TRAINING: "training",
  OTHER: "other",
} as const;

// 作業カテゴリ表示名
export const WORK_CATEGORY_LABELS = {
  [WORK_CATEGORIES.DEVELOPMENT]: "開発",
  [WORK_CATEGORIES.DESIGN]: "設計",
  [WORK_CATEGORIES.TESTING]: "テスト",
  [WORK_CATEGORIES.DOCUMENTATION]: "ドキュメント",
  [WORK_CATEGORIES.MEETING]: "会議",
  [WORK_CATEGORIES.RESEARCH]: "調査",
  [WORK_CATEGORIES.MAINTENANCE]: "保守",
  [WORK_CATEGORIES.TRAINING]: "研修",
  [WORK_CATEGORIES.OTHER]: "その他",
} as const;

// 作業カテゴリ色
export const WORK_CATEGORY_COLORS = {
  [WORK_CATEGORIES.DEVELOPMENT]: "#22c55e", // green
  [WORK_CATEGORIES.DESIGN]: "#8b5cf6", // violet
  [WORK_CATEGORIES.TESTING]: "#f59e0b", // amber
  [WORK_CATEGORIES.DOCUMENTATION]: "#3b82f6", // blue
  [WORK_CATEGORIES.MEETING]: "#ef4444", // red
  [WORK_CATEGORIES.RESEARCH]: "#06b6d4", // cyan
  [WORK_CATEGORIES.MAINTENANCE]: "#f97316", // orange
  [WORK_CATEGORIES.TRAINING]: "#84cc16", // lime
  [WORK_CATEGORIES.OTHER]: "#6b7280", // gray
} as const;

// 時間入力の形式
export const TIME_INPUT_FORMATS = {
  HOURS_MINUTES: "HH:mm",
  DECIMAL_HOURS: "H.HH",
  MINUTES: "mmm",
} as const;

// 時間入力形式表示名
export const TIME_INPUT_FORMAT_LABELS = {
  [TIME_INPUT_FORMATS.HOURS_MINUTES]: "時:分",
  [TIME_INPUT_FORMATS.DECIMAL_HOURS]: "時間（小数）",
  [TIME_INPUT_FORMATS.MINUTES]: "分",
} as const;

// 週報の提出期限
export const SUBMISSION_DEADLINE = {
  DAY_OF_WEEK: WEEKDAYS.MONDAY, // 月曜日
  HOUR: 10, // 10時
  MINUTE: 0, // 0分
} as const;

// 週報の自動保存間隔（ミリ秒）
export const AUTO_SAVE_INTERVAL = 30000; // 30秒

// 週報の文字数制限
export const TEXT_LIMITS = {
  WORK_CONTENT: 1000,
  ISSUES: 500,
  NEXT_WEEK_PLAN: 500,
  REMARKS: 300,
  DAILY_REMARKS: 200,
} as const;

// 週報の必須項目
export const REQUIRED_FIELDS = {
  WORK_HOURS: true,
  WORK_CONTENT: true,
  MOOD: true,
  ISSUES: false,
  NEXT_WEEK_PLAN: false,
  REMARKS: false,
} as const;

// 週報の通知設定
export const NOTIFICATION_SETTINGS = {
  DEADLINE_REMINDER: {
    ENABLED: true,
    DAYS_BEFORE: 1,
    HOURS_BEFORE: 2,
  },
  APPROVAL_NOTIFICATION: {
    ENABLED: true,
  },
  REJECTION_NOTIFICATION: {
    ENABLED: true,
  },
} as const;

// 週報の表示設定
export const DISPLAY_SETTINGS = {
  ROWS_PER_PAGE: 20,
  SHOW_WEEKENDS: true,
  SHOW_HOLIDAYS: true,
  DEFAULT_SORT_FIELD: "weekStartDate",
  DEFAULT_SORT_ORDER: "desc",
} as const;

// 週報の検索設定
export const SEARCH_SETTINGS = {
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 100,
  DEBOUNCE_DELAY: 300,
} as const;

// 週報のエクスポート設定
export const EXPORT_SETTINGS = {
  FORMATS: ["pdf", "excel", "csv"],
  MAX_RECORDS: 1000,
  DATE_RANGE_LIMIT: 365, // 日
} as const;

// 休日の種類
export const HOLIDAY_TYPES = {
  NATIONAL: "national",
  COMPANY: "company",
  PERSONAL: "personal",
} as const;

// 休日の種類表示名
export const HOLIDAY_TYPE_LABELS = {
  [HOLIDAY_TYPES.NATIONAL]: "国民の祝日",
  [HOLIDAY_TYPES.COMPANY]: "会社休日",
  [HOLIDAY_TYPES.PERSONAL]: "個人休暇",
} as const;

// 週報の集計設定
export const AGGREGATION_SETTINGS = {
  PERIODS: {
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    QUARTERLY: "quarterly",
    YEARLY: "yearly",
  },
  METRICS: {
    TOTAL_HOURS: "total_hours",
    AVERAGE_HOURS: "average_hours",
    OVERTIME_HOURS: "overtime_hours",
    SUBMISSION_RATE: "submission_rate",
    APPROVAL_RATE: "approval_rate",
  },
} as const;

// 型定義
export type WeeklyReportStatus = typeof WEEKLY_REPORT_STATUS[keyof typeof WEEKLY_REPORT_STATUS];
export type ReportType = typeof REPORT_TYPES[keyof typeof REPORT_TYPES];
export type WorkType = typeof WORK_TYPES[keyof typeof WORK_TYPES];
export type WorkCategory = typeof WORK_CATEGORIES[keyof typeof WORK_CATEGORIES];
export type TimeInputFormat = typeof TIME_INPUT_FORMATS[keyof typeof TIME_INPUT_FORMATS];
export type HolidayType = typeof HOLIDAY_TYPES[keyof typeof HOLIDAY_TYPES];
export type Weekday = typeof WEEKDAYS[keyof typeof WEEKDAYS];
