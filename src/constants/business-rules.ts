/**
 * ビジネスルール関連の定数
 */

// ファイル関連
export const FILE_LIMITS = {
  // ファイルサイズ制限
  MAX_SIZE: {
    IMAGE_MB: 5,
    IMAGE_BYTES: 5 * 1024 * 1024,
    DOCUMENT_MB: 10,
    DOCUMENT_BYTES: 10 * 1024 * 1024,
    AVATAR_MB: 2,
    AVATAR_BYTES: 2 * 1024 * 1024,
    ATTACHMENT_MB: 20,
    ATTACHMENT_BYTES: 20 * 1024 * 1024,
  },
  
  // 許可するファイルタイプ
  ALLOWED_TYPES: {
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENT: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    AVATAR: ['image/jpeg', 'image/png'],
  },
  
  // ファイル拡張子
  ALLOWED_EXTENSIONS: {
    IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    DOCUMENT: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    AVATAR: ['.jpg', '.jpeg', '.png'],
  },
} as const;

// フォームバリデーション
export const VALIDATION_RULES = {
  // 文字数制限
  TEXT_LENGTH: {
    MIN_NAME: 1,
    MAX_NAME: 50,
    MIN_EMAIL: 5,
    MAX_EMAIL: 255,
    MIN_PASSWORD: 8,
    MAX_PASSWORD: 128,
    MIN_DESCRIPTION: 10,
    MAX_DESCRIPTION: 1000,
    MAX_COMMENT: 500,
    MAX_REASON: 500,
    MAX_NOTE: 2000,
  },
  
  // 数値制限
  NUMBER: {
    MIN_HOURS: 0,
    MAX_HOURS_PER_DAY: 24,
    MAX_HOURS_PER_WEEK: 168,
    MIN_RATE: 0,
    MAX_RATE: 999999,
    MIN_AMOUNT: 0,
    MAX_AMOUNT: 9999999,
  },
  
  // パスワード要件
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
  },
} as const;

// 表示制限
export const DISPLAY_LIMITS = {
  // リスト表示
  DROPDOWN_MAX_ITEMS: 100,
  AUTOCOMPLETE_MAX_ITEMS: 50,
  NOTIFICATION_PREVIEW: 5,
  RECENT_ITEMS: 10,
  ACTIVITY_FEED: 20,
  
  // テーブル
  TABLE_ROWS_MIN: 5,
  TABLE_ROWS_DEFAULT: 10,
  TABLE_ROWS_MAX: 100,
  
  // ダッシュボード
  DASHBOARD_CARDS: 4,
  DASHBOARD_CHARTS: 6,
  DASHBOARD_RECENT_ITEMS: 5,
} as const;

// ビジネスロジック制限
export const BUSINESS_LIMITS = {
  // 勤務時間
  WORK_HOURS: {
    MIN_PER_DAY: 0,
    MAX_PER_DAY: 24,
    STANDARD_PER_DAY: 8,
    MAX_PER_WEEK: 40,
    MAX_OVERTIME_PER_MONTH: 45,
  },
  
  // 休暇
  LEAVE: {
    MIN_DAYS: 0.5,
    MAX_CONSECUTIVE_DAYS: 14,
    ANNUAL_PAID_DAYS: 20,
    SICK_LEAVE_DAYS: 5,
  },
  
  // プロジェクト
  PROJECT: {
    MIN_MEMBERS: 1,
    MAX_MEMBERS: 100,
    MIN_DURATION_DAYS: 1,
    MAX_DURATION_MONTHS: 60,
  },
  
  // 経費
  EXPENSE: {
    MIN_AMOUNT: 1,
    MAX_AMOUNT_WITHOUT_APPROVAL: 10000,
    MAX_AMOUNT_WITH_APPROVAL: 1000000,
    RECEIPT_REQUIRED_AMOUNT: 3000,
  },
} as const;

// パーセンテージ
export const PERCENTAGE = {
  MIN: 0,
  MAX: 100,
  UTILIZATION_TARGET: 80,
  UTILIZATION_WARNING: 60,
  ACHIEVEMENT_GOOD: 90,
  ACHIEVEMENT_WARNING: 70,
  TAX_RATE: 10,
} as const;

// 日付・時間関連
export const DATE_TIME = {
  // 期限
  WEEKLY_REPORT_DEADLINE_DAYS: 7,
  EXPENSE_SUBMISSION_DEADLINE_DAYS: 30,
  PASSWORD_EXPIRY_DAYS: 90,
  
  // 保持期間
  LOG_RETENTION_DAYS: 90,
  TRASH_RETENTION_DAYS: 30,
  ARCHIVE_RETENTION_YEARS: 5,
  
  // 営業日
  BUSINESS_DAYS_PER_WEEK: 5,
  HOLIDAYS_PER_YEAR: 16,
} as const;

// ステータス閾値
export const STATUS_THRESHOLDS = {
  // 稼働率
  UTILIZATION: {
    LOW: 60,
    NORMAL: 80,
    HIGH: 95,
    CRITICAL: 100,
  },
  
  // 進捗率
  PROGRESS: {
    BEHIND: 70,
    ON_TRACK: 90,
    AHEAD: 110,
  },
  
  // 健全性スコア
  HEALTH_SCORE: {
    POOR: 40,
    FAIR: 60,
    GOOD: 80,
    EXCELLENT: 95,
  },
} as const;

// 通貨・金額
export const CURRENCY = {
  DEFAULT: 'JPY',
  SYMBOL: '¥',
  DECIMAL_PLACES: 0,
  THOUSAND_SEPARATOR: ',',
  FORMAT_PATTERN: '#,##0',
} as const;

// 優先度
export const PRIORITY = {
  URGENT: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
} as const;

// その他のビジネスルール
export const MISC_RULES = {
  // 再試行
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  
  // セッション
  SESSION_TIMEOUT_MINUTES: 30,
  REMEMBER_ME_DAYS: 30,
  
  // 通知
  NOTIFICATION_RETENTION_DAYS: 30,
  MAX_NOTIFICATIONS_PER_USER: 1000,
  
  // バッチ処理
  BATCH_SIZE: 100,
  MAX_CONCURRENT_REQUESTS: 5,
} as const;

// ユーティリティ関数
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: CURRENCY.DEFAULT,
    minimumFractionDigits: CURRENCY.DECIMAL_PLACES,
    maximumFractionDigits: CURRENCY.DECIMAL_PLACES,
  }).format(amount);
};

export const isWithinLimit = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};