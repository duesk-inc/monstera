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
  TRANSPORTATION: "transportation",
  ACCOMMODATION: "accommodation",
  MEALS: "meals",
  ENTERTAINMENT: "entertainment",
  OFFICE_SUPPLIES: "office_supplies",
  COMMUNICATION: "communication",
  TRAINING: "training",
  CONFERENCE: "conference",
  SOFTWARE: "software",
  EQUIPMENT: "equipment",
  BOOKS: "books",
  PARKING: "parking",
  FUEL: "fuel",
  MAINTENANCE: "maintenance",
  INSURANCE: "insurance",
  LEGAL: "legal",
  CONSULTING: "consulting",
  MARKETING: "marketing",
  UTILITIES: "utilities",
  RENT: "rent",
  OTHER: "other",
} as const;

// 経費カテゴリ表示名
export const EXPENSE_CATEGORY_LABELS = {
  [EXPENSE_CATEGORIES.TRANSPORTATION]: "交通費",
  [EXPENSE_CATEGORIES.ACCOMMODATION]: "宿泊費",
  [EXPENSE_CATEGORIES.MEALS]: "食費",
  [EXPENSE_CATEGORIES.ENTERTAINMENT]: "接待費",
  [EXPENSE_CATEGORIES.OFFICE_SUPPLIES]: "事務用品",
  [EXPENSE_CATEGORIES.COMMUNICATION]: "通信費",
  [EXPENSE_CATEGORIES.TRAINING]: "研修費",
  [EXPENSE_CATEGORIES.CONFERENCE]: "会議費",
  [EXPENSE_CATEGORIES.SOFTWARE]: "ソフトウェア",
  [EXPENSE_CATEGORIES.EQUIPMENT]: "機材費",
  [EXPENSE_CATEGORIES.BOOKS]: "書籍費",
  [EXPENSE_CATEGORIES.PARKING]: "駐車場代",
  [EXPENSE_CATEGORIES.FUEL]: "燃料費",
  [EXPENSE_CATEGORIES.MAINTENANCE]: "保守費",
  [EXPENSE_CATEGORIES.INSURANCE]: "保険料",
  [EXPENSE_CATEGORIES.LEGAL]: "法務費",
  [EXPENSE_CATEGORIES.CONSULTING]: "コンサルティング費",
  [EXPENSE_CATEGORIES.MARKETING]: "マーケティング費",
  [EXPENSE_CATEGORIES.UTILITIES]: "光熱費",
  [EXPENSE_CATEGORIES.RENT]: "賃料",
  [EXPENSE_CATEGORIES.OTHER]: "その他",
} as const;

// 経費カテゴリ色
export const EXPENSE_CATEGORY_COLORS = {
  [EXPENSE_CATEGORIES.TRANSPORTATION]: "#3b82f6", // blue-500
  [EXPENSE_CATEGORIES.ACCOMMODATION]: "#8b5cf6", // violet-500
  [EXPENSE_CATEGORIES.MEALS]: "#f59e0b", // amber-500
  [EXPENSE_CATEGORIES.ENTERTAINMENT]: "#ec4899", // pink-500
  [EXPENSE_CATEGORIES.OFFICE_SUPPLIES]: "#22c55e", // green-500
  [EXPENSE_CATEGORIES.COMMUNICATION]: "#06b6d4", // cyan-500
  [EXPENSE_CATEGORIES.TRAINING]: "#84cc16", // lime-500
  [EXPENSE_CATEGORIES.CONFERENCE]: "#f97316", // orange-500
  [EXPENSE_CATEGORIES.SOFTWARE]: "#6366f1", // indigo-500
  [EXPENSE_CATEGORIES.EQUIPMENT]: "#8b5cf6", // violet-500
  [EXPENSE_CATEGORIES.BOOKS]: "#06b6d4", // cyan-500
  [EXPENSE_CATEGORIES.PARKING]: "#6b7280", // gray-500
  [EXPENSE_CATEGORIES.FUEL]: "#ef4444", // red-500
  [EXPENSE_CATEGORIES.MAINTENANCE]: "#f59e0b", // amber-500
  [EXPENSE_CATEGORIES.INSURANCE]: "#3b82f6", // blue-500
  [EXPENSE_CATEGORIES.LEGAL]: "#1f2937", // gray-800
  [EXPENSE_CATEGORIES.CONSULTING]: "#7c3aed", // violet-600
  [EXPENSE_CATEGORIES.MARKETING]: "#e11d48", // rose-600
  [EXPENSE_CATEGORIES.UTILITIES]: "#059669", // emerald-600
  [EXPENSE_CATEGORIES.RENT]: "#dc2626", // red-600
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
  SUBMISSION_DAYS: 30, // 30日以内
  APPROVAL_DAYS: 7, // 7日以内
  PAYMENT_DAYS: 14, // 14日以内
  RECEIPT_UPLOAD_DAYS: 3, // 3日以内
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

// 型定義
export type ExpenseStatus = typeof EXPENSE_STATUS[keyof typeof EXPENSE_STATUS];
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[keyof typeof EXPENSE_CATEGORIES];
export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
export type ApprovalLevel = typeof APPROVAL_LEVELS[keyof typeof APPROVAL_LEVELS];
export type Currency = typeof CURRENCIES[keyof typeof CURRENCIES];
export type TaxRate = typeof TAX_RATES[keyof typeof TAX_RATES];