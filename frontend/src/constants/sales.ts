// 営業・売上関連の定数定義

// 営業ステータス
export const SALES_STATUS = {
  PROSPECT: "prospect",
  NEGOTIATION: "negotiation",
  PROPOSAL: "proposal",
  CONTRACT: "contract",
  CLOSED_WON: "closed_won",
  CLOSED_LOST: "closed_lost",
  ON_HOLD: "on_hold",
} as const;

// 営業ステータス表示名
export const SALES_STATUS_LABELS = {
  [SALES_STATUS.PROSPECT]: "見込み",
  [SALES_STATUS.NEGOTIATION]: "商談中",
  [SALES_STATUS.PROPOSAL]: "提案",
  [SALES_STATUS.CONTRACT]: "契約",
  [SALES_STATUS.CLOSED_WON]: "受注",
  [SALES_STATUS.CLOSED_LOST]: "失注",
  [SALES_STATUS.ON_HOLD]: "保留",
} as const;

// 営業ステータス色
export const SALES_STATUS_COLORS = {
  [SALES_STATUS.PROSPECT]: "#6b7280", // gray-500
  [SALES_STATUS.NEGOTIATION]: "#3b82f6", // blue-500
  [SALES_STATUS.PROPOSAL]: "#f59e0b", // amber-500
  [SALES_STATUS.CONTRACT]: "#8b5cf6", // violet-500
  [SALES_STATUS.CLOSED_WON]: "#22c55e", // green-500
  [SALES_STATUS.CLOSED_LOST]: "#ef4444", // red-500
  [SALES_STATUS.ON_HOLD]: "#6b7280", // gray-500
} as const;

// チーム役割
export const TEAM_ROLES = {
  MANAGER: "manager",
  LEADER: "leader",
  SENIOR: "senior",
  JUNIOR: "junior",
  INTERN: "intern",
} as const;

// チーム役割表示名
export const TEAM_ROLE_LABELS = {
  [TEAM_ROLES.MANAGER]: "マネージャー",
  [TEAM_ROLES.LEADER]: "リーダー",
  [TEAM_ROLES.SENIOR]: "シニア",
  [TEAM_ROLES.JUNIOR]: "ジュニア",
  [TEAM_ROLES.INTERN]: "インターン",
} as const;

// 売上目標の種類
export const TARGET_TYPES = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
  PROJECT: "project",
} as const;

// 売上目標の種類表示名
export const TARGET_TYPE_LABELS = {
  [TARGET_TYPES.MONTHLY]: "月次目標",
  [TARGET_TYPES.QUARTERLY]: "四半期目標",
  [TARGET_TYPES.YEARLY]: "年次目標",
  [TARGET_TYPES.PROJECT]: "プロジェクト目標",
} as const;

// 営業フェーズ
export const SALES_PHASES = {
  LEAD_GENERATION: "lead_generation",
  QUALIFICATION: "qualification",
  NEEDS_ANALYSIS: "needs_analysis",
  PROPOSAL_CREATION: "proposal_creation",
  NEGOTIATION: "negotiation",
  CLOSING: "closing",
  POST_SALE: "post_sale",
} as const;

// 営業フェーズ表示名
export const SALES_PHASE_LABELS = {
  [SALES_PHASES.LEAD_GENERATION]: "リード獲得",
  [SALES_PHASES.QUALIFICATION]: "資格確認",
  [SALES_PHASES.NEEDS_ANALYSIS]: "ニーズ分析",
  [SALES_PHASES.PROPOSAL_CREATION]: "提案作成",
  [SALES_PHASES.NEGOTIATION]: "交渉",
  [SALES_PHASES.CLOSING]: "クロージング",
  [SALES_PHASES.POST_SALE]: "アフターセール",
} as const;

// 顧客タイプ
export const CUSTOMER_TYPES = {
  ENTERPRISE: "enterprise",
  SME: "sme",
  STARTUP: "startup",
  GOVERNMENT: "government",
  NON_PROFIT: "non_profit",
} as const;

// 顧客タイプ表示名
export const CUSTOMER_TYPE_LABELS = {
  [CUSTOMER_TYPES.ENTERPRISE]: "大企業",
  [CUSTOMER_TYPES.SME]: "中小企業",
  [CUSTOMER_TYPES.STARTUP]: "スタートアップ",
  [CUSTOMER_TYPES.GOVERNMENT]: "官公庁",
  [CUSTOMER_TYPES.NON_PROFIT]: "非営利団体",
} as const;

// 契約タイプ
export const CONTRACT_TYPES = {
  FIXED_PRICE: "fixed_price",
  TIME_AND_MATERIALS: "time_and_materials",
  RETAINER: "retainer",
  MILESTONE: "milestone",
  SUBSCRIPTION: "subscription",
} as const;

// 契約タイプ表示名
export const CONTRACT_TYPE_LABELS = {
  [CONTRACT_TYPES.FIXED_PRICE]: "固定価格",
  [CONTRACT_TYPES.TIME_AND_MATERIALS]: "時間単価",
  [CONTRACT_TYPES.RETAINER]: "リテイナー",
  [CONTRACT_TYPES.MILESTONE]: "マイルストーン",
  [CONTRACT_TYPES.SUBSCRIPTION]: "サブスクリプション",
} as const;

// 売上分類
export const REVENUE_CATEGORIES = {
  NEW_BUSINESS: "new_business",
  EXISTING_BUSINESS: "existing_business",
  EXPANSION: "expansion",
  RENEWAL: "renewal",
  UPSELL: "upsell",
  CROSS_SELL: "cross_sell",
} as const;

// 売上分類表示名
export const REVENUE_CATEGORY_LABELS = {
  [REVENUE_CATEGORIES.NEW_BUSINESS]: "新規事業",
  [REVENUE_CATEGORIES.EXISTING_BUSINESS]: "既存事業",
  [REVENUE_CATEGORIES.EXPANSION]: "拡張",
  [REVENUE_CATEGORIES.RENEWAL]: "更新",
  [REVENUE_CATEGORIES.UPSELL]: "アップセル",
  [REVENUE_CATEGORIES.CROSS_SELL]: "クロスセル",
} as const;

// 営業活動の種類
export const ACTIVITY_TYPES = {
  CALL: "call",
  EMAIL: "email",
  MEETING: "meeting",
  DEMO: "demo",
  PRESENTATION: "presentation",
  PROPOSAL: "proposal",
  FOLLOW_UP: "follow_up",
  NEGOTIATION: "negotiation",
} as const;

// 営業活動の種類表示名
export const ACTIVITY_TYPE_LABELS = {
  [ACTIVITY_TYPES.CALL]: "電話",
  [ACTIVITY_TYPES.EMAIL]: "メール",
  [ACTIVITY_TYPES.MEETING]: "会議",
  [ACTIVITY_TYPES.DEMO]: "デモ",
  [ACTIVITY_TYPES.PRESENTATION]: "プレゼンテーション",
  [ACTIVITY_TYPES.PROPOSAL]: "提案",
  [ACTIVITY_TYPES.FOLLOW_UP]: "フォローアップ",
  [ACTIVITY_TYPES.NEGOTIATION]: "交渉",
} as const;

// 営業の優先度
export const SALES_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

// 営業の優先度表示名
export const SALES_PRIORITY_LABELS = {
  [SALES_PRIORITIES.LOW]: "低",
  [SALES_PRIORITIES.MEDIUM]: "中",
  [SALES_PRIORITIES.HIGH]: "高",
  [SALES_PRIORITIES.URGENT]: "緊急",
} as const;

// 営業の優先度色
export const SALES_PRIORITY_COLORS = {
  [SALES_PRIORITIES.LOW]: "#6b7280", // gray-500
  [SALES_PRIORITIES.MEDIUM]: "#3b82f6", // blue-500
  [SALES_PRIORITIES.HIGH]: "#f59e0b", // amber-500
  [SALES_PRIORITIES.URGENT]: "#ef4444", // red-500
} as const;

// 失注理由
export const LOSS_REASONS = {
  PRICE: "price",
  TIMELINE: "timeline",
  FEATURES: "features",
  COMPETITOR: "competitor",
  BUDGET: "budget",
  DECISION_MAKER: "decision_maker",
  TIMING: "timing",
  OTHER: "other",
} as const;

// 失注理由表示名
export const LOSS_REASON_LABELS = {
  [LOSS_REASONS.PRICE]: "価格",
  [LOSS_REASONS.TIMELINE]: "タイムライン",
  [LOSS_REASONS.FEATURES]: "機能",
  [LOSS_REASONS.COMPETITOR]: "競合",
  [LOSS_REASONS.BUDGET]: "予算",
  [LOSS_REASONS.DECISION_MAKER]: "意思決定者",
  [LOSS_REASONS.TIMING]: "タイミング",
  [LOSS_REASONS.OTHER]: "その他",
} as const;

// 売上計算の設定
export const SALES_CALCULATION_SETTINGS = {
  COMMISSION_RATE: 0.05, // 5%
  TAX_RATE: 0.1, // 10%
  DISCOUNT_THRESHOLD: 1000000, // 100万円
  MAX_DISCOUNT_RATE: 0.2, // 20%
} as const;

// 売上レポートの設定
export const SALES_REPORTING_SETTINGS = {
  DEFAULT_PERIOD: "monthly",
  FORECAST_MONTHS: 3,
  TREND_ANALYSIS_MONTHS: 12,
  PERFORMANCE_METRICS: [
    "revenue",
    "deals_closed",
    "conversion_rate",
    "average_deal_size",
    "sales_cycle_length",
  ],
} as const;

// 営業目標の設定
export const SALES_TARGET_SETTINGS = {
  QUARTERLY_TARGET_MULTIPLIER: 3,
  YEARLY_TARGET_MULTIPLIER: 12,
  STRETCH_TARGET_MULTIPLIER: 1.2,
  MINIMUM_TARGET_MULTIPLIER: 0.8,
} as const;

// 営業パフォーマンスの評価基準
export const PERFORMANCE_CRITERIA = {
  EXCELLENT: { min: 1.2, label: "優秀" },
  GOOD: { min: 1.0, label: "良好" },
  SATISFACTORY: { min: 0.8, label: "満足" },
  NEEDS_IMPROVEMENT: { min: 0.6, label: "要改善" },
  POOR: { min: 0, label: "不良" },
} as const;

// API エンドポイント
export const SALES_API_ENDPOINTS = {
  TEAMS: "/api/v1/sales/teams",
  MEMBERS: "/api/v1/sales/members",
  TARGETS: "/api/v1/sales/targets",
  PERFORMANCE: "/api/v1/sales/performance",
  REPORTS: "/api/v1/sales/reports",
  ACTIVITIES: "/api/v1/sales/activities",
  CUSTOMERS: "/api/v1/sales/customers",
  DEALS: "/api/v1/sales/deals",
  FORECASTS: "/api/v1/sales/forecasts",
} as const;

// 金額タイプ
export const AMOUNT_TYPE = {
  FIXED: "fixed",
  HOURLY: "hourly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

// キャンペーンステータス
export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

// キャンペーンステータス色
export const CAMPAIGN_STATUS_COLORS = {
  [CAMPAIGN_STATUS.DRAFT]: "#6b7280",
  [CAMPAIGN_STATUS.ACTIVE]: "#22c55e",
  [CAMPAIGN_STATUS.PAUSED]: "#f59e0b",
  [CAMPAIGN_STATUS.COMPLETED]: "#3b82f6",
  [CAMPAIGN_STATUS.CANCELLED]: "#ef4444",
} as const;

// エクステンションステータス
export const EXTENSION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  EXPIRED: "expired",
} as const;

// エクステンションステータス色
export const EXTENSION_STATUS_COLORS = {
  [EXTENSION_STATUS.PENDING]: "#f59e0b",
  [EXTENSION_STATUS.APPROVED]: "#22c55e",
  [EXTENSION_STATUS.REJECTED]: "#ef4444",
  [EXTENSION_STATUS.EXPIRED]: "#6b7280",
} as const;

// エクステンションタイプ
export const EXTENSION_TYPE = {
  CONTRACT: "contract",
  PROJECT: "project",
  SUPPORT: "support",
  MAINTENANCE: "maintenance",
} as const;

// インタビューステータス
export const INTERVIEW_STATUS = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

// インタビューステータス色
export const INTERVIEW_STATUS_COLORS = {
  [INTERVIEW_STATUS.SCHEDULED]: "#3b82f6",
  [INTERVIEW_STATUS.IN_PROGRESS]: "#f59e0b",
  [INTERVIEW_STATUS.COMPLETED]: "#22c55e",
  [INTERVIEW_STATUS.CANCELLED]: "#ef4444",
  [INTERVIEW_STATUS.NO_SHOW]: "#6b7280",
} as const;

// ミーティングタイプ
export const MEETING_TYPE = {
  INITIAL: "initial",
  FOLLOW_UP: "follow_up",
  PRESENTATION: "presentation",
  NEGOTIATION: "negotiation",
  CLOSING: "closing",
  REVIEW: "review",
} as const;

// 提案ステータス
export const PROPOSAL_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

// 提案ステータス色
export const PROPOSAL_STATUS_COLORS = {
  [PROPOSAL_STATUS.DRAFT]: "#6b7280",
  [PROPOSAL_STATUS.SUBMITTED]: "#3b82f6",
  [PROPOSAL_STATUS.UNDER_REVIEW]: "#f59e0b",
  [PROPOSAL_STATUS.APPROVED]: "#22c55e",
  [PROPOSAL_STATUS.REJECTED]: "#ef4444",
  [PROPOSAL_STATUS.CANCELLED]: "#9ca3af",
} as const;

// POC同期ステータス
export const POC_SYNC_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

// POC同期ステータス色
export const POC_SYNC_STATUS_COLORS = {
  [POC_SYNC_STATUS.PENDING]: "#6b7280",
  [POC_SYNC_STATUS.IN_PROGRESS]: "#f59e0b",
  [POC_SYNC_STATUS.COMPLETED]: "#22c55e",
  [POC_SYNC_STATUS.FAILED]: "#ef4444",
} as const;

// Eメールテンプレートタイプ
export const EMAIL_TEMPLATE_TYPE = {
  WELCOME: "welcome",
  FOLLOW_UP: "follow_up",
  PROPOSAL: "proposal",
  CONTRACT: "contract",
  THANK_YOU: "thank_you",
  REMINDER: "reminder",
} as const;

// Eメールテンプレート変数
export const EMAIL_TEMPLATE_VARIABLES = {
  CUSTOMER_NAME: "{{customer_name}}",
  COMPANY_NAME: "{{company_name}}",
  PROPOSAL_DATE: "{{proposal_date}}",
  CONTRACT_DATE: "{{contract_date}}",
  AMOUNT: "{{amount}}",
  SALES_PERSON: "{{sales_person}}",
} as const;

// 営業エンドポイント
export const SALES_ENDPOINTS = {
  PROPOSALS: "/api/v1/sales/proposals",
  CAMPAIGNS: "/api/v1/sales/campaigns",
  INTERVIEWS: "/api/v1/sales/interviews",
  EXTENSIONS: "/api/v1/sales/extensions",
  POC_PROJECTS: "/api/v1/sales/poc-projects",
  EMAIL_TEMPLATES: "/api/v1/sales/email-templates",
  EMAIL_CAMPAIGNS: "/api/v1/sales/email-campaigns",
  USERS: "/api/v1/sales/users",
} as const;

// 営業権限
export const SALES_PERMISSIONS = {
  VIEW_ALL: "sales:view_all",
  VIEW_OWN: "sales:view_own",
  CREATE: "sales:create",
  UPDATE: "sales:update",
  DELETE: "sales:delete",
  MANAGE_TEAMS: "sales:manage_teams",
  APPROVE_PROPOSALS: "sales:approve_proposals",
} as const;

// 営業ロール
export const SALES_ROLES = {
  ADMIN: "sales_admin",
  MANAGER: "sales_manager",
  SENIOR: "sales_senior",
  JUNIOR: "sales_junior",
  INTERN: "sales_intern",
} as const;

// 営業UI設定
export const SALES_UI = {
  ITEMS_PER_PAGE: 20,
  MAX_ITEMS_PER_PAGE: 100,
  DEFAULT_SORT: "created_at",
  DEFAULT_ORDER: "desc",
  SEARCH_DEBOUNCE: 300,
} as const;

// 型定義
export type SalesStatus = typeof SALES_STATUS[keyof typeof SALES_STATUS];
export type TeamRole = typeof TEAM_ROLES[keyof typeof TEAM_ROLES];
export type TargetType = typeof TARGET_TYPES[keyof typeof TARGET_TYPES];
export type SalesPhase = typeof SALES_PHASES[keyof typeof SALES_PHASES];
export type CustomerType = typeof CUSTOMER_TYPES[keyof typeof CUSTOMER_TYPES];
export type ContractType = typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES];
export type RevenueCategory = typeof REVENUE_CATEGORIES[keyof typeof REVENUE_CATEGORIES];
export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES];
export type SalesPriority = typeof SALES_PRIORITIES[keyof typeof SALES_PRIORITIES];
export type LossReason = typeof LOSS_REASONS[keyof typeof LOSS_REASONS];
export type AmountType = typeof AMOUNT_TYPE[keyof typeof AMOUNT_TYPE];
export type CampaignStatus = typeof CAMPAIGN_STATUS[keyof typeof CAMPAIGN_STATUS];
export type ExtensionStatus = typeof EXTENSION_STATUS[keyof typeof EXTENSION_STATUS];
export type InterviewStatus = typeof INTERVIEW_STATUS[keyof typeof INTERVIEW_STATUS];
export type ProposalStatus = typeof PROPOSAL_STATUS[keyof typeof PROPOSAL_STATUS];
export type PocSyncStatus = typeof POC_SYNC_STATUS[keyof typeof POC_SYNC_STATUS];
export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPE[keyof typeof EMAIL_TEMPLATE_TYPE];