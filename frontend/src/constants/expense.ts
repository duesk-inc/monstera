// 経費関連の定数定義

// 経費ステータス
export const EXPENSE_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

// 経費ステータス表示名
export const EXPENSE_STATUS_LABELS = {
  [EXPENSE_STATUS.DRAFT]: "下書き",
  [EXPENSE_STATUS.SUBMITTED]: "申請済み",
  [EXPENSE_STATUS.APPROVED]: "承認済み",
  [EXPENSE_STATUS.REJECTED]: "却下",
  [EXPENSE_STATUS.PAID]: "支払済み",
  [EXPENSE_STATUS.CANCELLED]: "キャンセル",
} as const;

// 経費ステータス色
export const EXPENSE_STATUS_COLORS = {
  [EXPENSE_STATUS.DRAFT]: "#6b7280", // gray-500
  [EXPENSE_STATUS.SUBMITTED]: "#3b82f6", // blue-500
  [EXPENSE_STATUS.APPROVED]: "#22c55e", // green-500
  [EXPENSE_STATUS.REJECTED]: "#ef4444", // red-500
  [EXPENSE_STATUS.PAID]: "#8b5cf6", // violet-500
  [EXPENSE_STATUS.CANCELLED]: "#9ca3af", // gray-400
} as const;

// 経費カテゴリ
export const EXPENSE_CATEGORIES = {
  TRANSPORT: "transport",
  ENTERTAINMENT: "entertainment",
  SUPPLIES: "supplies",
  BOOKS: "books",
  SEMINAR: "seminar",
  OTHER: "other",
} as const;

// 経費カテゴリ表示名
export const EXPENSE_CATEGORY_LABELS = {
  [EXPENSE_CATEGORIES.TRANSPORT]: "旅費交通費",
  [EXPENSE_CATEGORIES.ENTERTAINMENT]: "交際費",
  [EXPENSE_CATEGORIES.SUPPLIES]: "備品",
  [EXPENSE_CATEGORIES.BOOKS]: "書籍",
  [EXPENSE_CATEGORIES.SEMINAR]: "セミナー",
  [EXPENSE_CATEGORIES.OTHER]: "その他",
} as const;

// 経費カテゴリ色
export const EXPENSE_CATEGORY_COLORS = {
  [EXPENSE_CATEGORIES.TRANSPORT]: "#3b82f6", // blue-500
  [EXPENSE_CATEGORIES.ENTERTAINMENT]: "#ec4899", // pink-500
  [EXPENSE_CATEGORIES.SUPPLIES]: "#22c55e", // green-500
  [EXPENSE_CATEGORIES.BOOKS]: "#06b6d4", // cyan-500
  [EXPENSE_CATEGORIES.SEMINAR]: "#f97316", // orange-500
  [EXPENSE_CATEGORIES.OTHER]: "#6b7280", // gray-500
} as const;

// 支払い方法
export const PAYMENT_METHODS = {
  CASH: "cash",
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
  BANK_TRANSFER: "bank_transfer",
  ELECTRONIC_MONEY: "electronic_money",
  CORPORATE_CARD: "corporate_card",
  ADVANCE_PAYMENT: "advance_payment",
} as const;

// 支払い方法表示名
export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: "現金",
  [PAYMENT_METHODS.CREDIT_CARD]: "クレジットカード",
  [PAYMENT_METHODS.DEBIT_CARD]: "デビットカード",
  [PAYMENT_METHODS.BANK_TRANSFER]: "銀行振込",
  [PAYMENT_METHODS.ELECTRONIC_MONEY]: "電子マネー",
  [PAYMENT_METHODS.CORPORATE_CARD]: "法人カード",
  [PAYMENT_METHODS.ADVANCE_PAYMENT]: "立替払い",
} as const;

// 承認レベル
export const APPROVAL_LEVELS = {
  MANAGER: "manager",
  DIRECTOR: "director",
  FINANCE: "finance",
  EXECUTIVE: "executive",
} as const;

// 承認レベル表示名
export const APPROVAL_LEVEL_LABELS = {
  [APPROVAL_LEVELS.MANAGER]: "マネージャー",
  [APPROVAL_LEVELS.DIRECTOR]: "部長",
  [APPROVAL_LEVELS.FINANCE]: "経理",
  [APPROVAL_LEVELS.EXECUTIVE]: "役員",
} as const;

// 通貨
export const CURRENCIES = {
  JPY: "JPY",
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
  CNY: "CNY",
  KRW: "KRW",
} as const;

// 通貨表示名
export const CURRENCY_LABELS = {
  [CURRENCIES.JPY]: "日本円",
  [CURRENCIES.USD]: "米ドル",
  [CURRENCIES.EUR]: "ユーロ",
  [CURRENCIES.GBP]: "英ポンド",
  [CURRENCIES.CNY]: "中国元",
  [CURRENCIES.KRW]: "韓国ウォン",
} as const;

// 通貨記号
export const CURRENCY_SYMBOLS = {
  [CURRENCIES.JPY]: "¥",
  [CURRENCIES.USD]: "$",
  [CURRENCIES.EUR]: "€",
  [CURRENCIES.GBP]: "£",
  [CURRENCIES.CNY]: "¥",
  [CURRENCIES.KRW]: "₩",
} as const;

// 税率
export const TAX_RATES = {
  NONE: 0,
  REDUCED: 0.08, // 8%
  STANDARD: 0.1, // 10%
} as const;

// 税率表示名
export const TAX_RATE_LABELS = {
  [TAX_RATES.NONE]: "非課税",
  [TAX_RATES.REDUCED]: "軽減税率(8%)",
  [TAX_RATES.STANDARD]: "標準税率(10%)",
} as const;

// 経費の制限
export const EXPENSE_LIMITS = {
  MAX_AMOUNT: 1000000, // 100万円
  MAX_DAILY_MEALS: 5000, // 5,000円
  MAX_TRANSPORTATION: 50000, // 50,000円
  MAX_ACCOMMODATION: 20000, // 20,000円
  MAX_ENTERTAINMENT: 10000, // 10,000円
  RECEIPT_REQUIRED_THRESHOLD: 1000, // 1,000円
  AUTO_APPROVAL_THRESHOLD: 3000, // 3,000円
} as const;

// 経費の期限
export const EXPENSE_DEADLINES = {
  SUBMISSION_DAYS: 30, // 30日以内（レガシー）
  SUBMISSION_UNTIL_DAY: 10, // 翌月10日まで
  APPROVAL_DAYS: 7, // 7日以内
  PAYMENT_DAYS: 14, // 14日以内
  RECEIPT_UPLOAD_DAYS: 3, // 3日以内
  WARNING_DAYS: 7, // 期限7日前から警告
  CRITICAL_DAYS: 3, // 期限3日前から緊急警告
} as const;

// 領収書の設定
export const RECEIPT_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ],
  MAX_FILES_PER_EXPENSE: 5,
  IMAGE_COMPRESSION_QUALITY: 0.8,
  THUMBNAIL_SIZE: 150,
} as const;

// 経費レポートの設定
export const EXPENSE_REPORT_CONFIG = {
  DEFAULT_PERIOD: "monthly",
  EXPORT_FORMATS: ["pdf", "excel", "csv"],
  MAX_EXPORT_RECORDS: 10000,
  CHART_TYPES: ["bar", "pie", "line"],
  GROUPING_OPTIONS: ["category", "status", "date", "employee"],
} as const;

// 経費の通知設定
export const EXPENSE_NOTIFICATIONS = {
  SUBMISSION_REMINDER_DAYS: 25, // 25日経過で提醒
  APPROVAL_REMINDER_DAYS: 5, // 5日経過で提醒
  PAYMENT_NOTIFICATION: true,
  REJECTION_NOTIFICATION: true,
  DEADLINE_WARNING_DAYS: 3, // 3日前に警告
} as const;

// 経費の検索設定
export const EXPENSE_SEARCH_CONFIG = {
  DEFAULT_SORT_FIELD: "created_at",
  DEFAULT_SORT_ORDER: "desc",
  ITEMS_PER_PAGE: 20,
  MAX_SEARCH_RESULTS: 1000,
  SEARCH_FIELDS: ["description", "category", "amount", "status"],
} as const;

// 経費の表示設定
export const EXPENSE_DISPLAY_CONFIG = {
  DEFAULT_CURRENCY: CURRENCIES.JPY,
  AMOUNT_PRECISION: 0,
  SHOW_TAX_BREAKDOWN: true,
  SHOW_APPROVAL_HISTORY: true,
  COMPACT_VIEW: false,
  SHOW_THUMBNAILS: true,
} as const;

// API エンドポイント
export const EXPENSE_API_ENDPOINTS = {
  EXPENSES: "/api/v1/expenses",
  CATEGORIES: "/api/v1/expenses/categories",
  RECEIPTS: "/api/v1/expenses/receipts",
  REPORTS: "/api/v1/expenses/reports",
  APPROVALS: "/api/v1/expenses/approvals",
  EXPORTS: "/api/v1/expenses/exports",
  TEMPLATES: "/api/v1/expenses/templates",
} as const;

// 経費メッセージ
export const EXPENSE_MESSAGES = {
  SUBMIT_SUCCESS: "経費申請を提出しました。",
  SUBMIT_FAILED: "経費申請の提出に失敗しました。",
  APPROVE_SUCCESS: "経費申請を承認しました。",
  APPROVE_FAILED: "経費申請の承認に失敗しました。",
  REJECT_SUCCESS: "経費申請を却下しました。",
  REJECT_FAILED: "経費申請の却下に失敗しました。",
  DELETE_SUCCESS: "経費申請を削除しました。",
  DELETE_FAILED: "経費申請の削除に失敗しました。",
  SAVE_SUCCESS: "経費申請を保存しました。",
  SAVE_FAILED: "経費申請の保存に失敗しました。",
  UPLOAD_SUCCESS: "領収書をアップロードしました。",
  UPLOAD_FAILED: "領収書のアップロードに失敗しました。",
  FILE_TOO_LARGE: "ファイルサイズが大きすぎます。",
  INVALID_FILE_TYPE: "サポートされていないファイル形式です。",
  AMOUNT_REQUIRED: "金額は必須です。",
  DESCRIPTION_REQUIRED: "説明は必須です。",
  CATEGORY_REQUIRED: "カテゴリは必須です。",
  DATE_REQUIRED: "日付は必須です。",
  RECEIPT_REQUIRED: "領収書は必須です。",
  VALIDATION_ERROR: "入力内容に誤りがあります。",
  DEADLINE_EXCEEDED: "申請期限を過ぎているため、この経費は申請できません。",
  DEADLINE_WARNING: "申請期限が近づいています。",
  DEADLINE_CRITICAL: "申請期限が迫っています。",
  DEADLINE_EXPIRED: "申請期限を過ぎています。",
} as const;

// アップロード定数
export const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE: RECEIPT_CONFIG.MAX_FILE_SIZE,
  ALLOWED_TYPES: RECEIPT_CONFIG.ALLOWED_FILE_TYPES,
  MAX_FILES: RECEIPT_CONFIG.MAX_FILES_PER_EXPENSE,
  CHUNK_SIZE: 1024 * 1024, // 1MB
  TIMEOUT: 30000, // 30秒
  RETRY_ATTEMPTS: 3,
  PROGRESS_UPDATE_INTERVAL: 100, // 100ms
} as const;

// バリデーション定数
export const VALIDATION_CONSTANTS = {
  AMOUNT: {
    MIN: 1,
    MAX: EXPENSE_LIMITS.MAX_AMOUNT,
  },
  DESCRIPTION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 500,
  },
  RECEIPT_DESCRIPTION: {
    MAX_LENGTH: 200,
  },
  DATE: {
    MIN_DAYS_AGO: EXPENSE_DEADLINES.SUBMISSION_DAYS,
    MAX_DAYS_FUTURE: 0,
  },
  FILES: {
    MAX_SIZE: RECEIPT_CONFIG.MAX_FILE_SIZE,
    MAX_COUNT: RECEIPT_CONFIG.MAX_FILES_PER_EXPENSE,
    ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".webp"],
  },
} as const;

// ソート方向
export const SORT_DIRECTION = {
  ASC: 'asc' as const,
  DESC: 'desc' as const,
};

// ソート可能フィールド
export const SORTABLE_FIELDS = {
  DATE: 'date' as const,
  AMOUNT: 'amount' as const,
  STATUS: 'status' as const,
  CREATED_AT: 'created_at' as const,
  UPDATED_AT: 'updated_at' as const,
};

// ページネーション定数
export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
};

// フィルター定数
export const FILTER_CONSTANTS = {
  DEFAULT_DATE_RANGE_DAYS: 30,
  MAX_DATE_RANGE_DAYS: 365,
  DEFAULT_STATUS_FILTER: [] as ExpenseStatus[],
};

// 型定義
export type ExpenseStatus = typeof EXPENSE_STATUS[keyof typeof EXPENSE_STATUS];
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[keyof typeof EXPENSE_CATEGORIES];
export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
export type ApprovalLevel = typeof APPROVAL_LEVELS[keyof typeof APPROVAL_LEVELS];
export type Currency = typeof CURRENCIES[keyof typeof CURRENCIES];
export type TaxRate = typeof TAX_RATES[keyof typeof TAX_RATES];