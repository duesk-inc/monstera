// エンジニア関連の定数定義

// エンジニアステータス
export const ENGINEER_STATUS = {
  AVAILABLE: "available",
  ASSIGNED: "assigned",
  ON_LEAVE: "on_leave",
  INACTIVE: "inactive",
} as const;

// エンジニアステータス表示名
export const ENGINEER_STATUS_LABELS = {
  [ENGINEER_STATUS.AVAILABLE]: "待機中",
  [ENGINEER_STATUS.ASSIGNED]: "参画中",
  [ENGINEER_STATUS.ON_LEAVE]: "休職中",
  [ENGINEER_STATUS.INACTIVE]: "非アクティブ",
} as const;

// エンジニアステータス色
export const ENGINEER_STATUS_COLORS = {
  [ENGINEER_STATUS.AVAILABLE]: "#22c55e", // green
  [ENGINEER_STATUS.ASSIGNED]: "#3b82f6", // blue
  [ENGINEER_STATUS.ON_LEAVE]: "#f59e0b", // amber
  [ENGINEER_STATUS.INACTIVE]: "#6b7280", // gray
} as const;

// スキルレベル
export const SKILL_LEVELS = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
  MASTER: 5,
} as const;

// スキルレベル表示名
export const SKILL_LEVEL_LABELS = {
  [SKILL_LEVELS.BEGINNER]: "初級",
  [SKILL_LEVELS.INTERMEDIATE]: "中級",
  [SKILL_LEVELS.ADVANCED]: "上級",
  [SKILL_LEVELS.EXPERT]: "エキスパート",
  [SKILL_LEVELS.MASTER]: "マスター",
} as const;

// スキルレベル色
export const SKILL_LEVEL_COLORS = {
  [SKILL_LEVELS.BEGINNER]: "#ef4444", // red
  [SKILL_LEVELS.INTERMEDIATE]: "#f59e0b", // amber
  [SKILL_LEVELS.ADVANCED]: "#22c55e", // green
  [SKILL_LEVELS.EXPERT]: "#3b82f6", // blue
  [SKILL_LEVELS.MASTER]: "#8b5cf6", // violet
} as const;

// 経験年数範囲
export const EXPERIENCE_RANGES = {
  ENTRY: "0-1",
  JUNIOR: "1-3",
  MIDDLE: "3-5",
  SENIOR: "5-10",
  EXPERT: "10+",
} as const;

// 経験年数範囲表示名
export const EXPERIENCE_RANGE_LABELS = {
  [EXPERIENCE_RANGES.ENTRY]: "0-1年",
  [EXPERIENCE_RANGES.JUNIOR]: "1-3年",
  [EXPERIENCE_RANGES.MIDDLE]: "3-5年",
  [EXPERIENCE_RANGES.SENIOR]: "5-10年",
  [EXPERIENCE_RANGES.EXPERT]: "10年以上",
} as const;

// 技術カテゴリ
export const TECHNOLOGY_CATEGORIES = {
  FRONTEND: "frontend",
  BACKEND: "backend",
  DATABASE: "database",
  INFRASTRUCTURE: "infrastructure",
  MOBILE: "mobile",
  DESIGN: "design",
  TESTING: "testing",
  TOOLS: "tools",
  OTHER: "other",
} as const;

// 技術カテゴリ表示名
export const TECHNOLOGY_CATEGORY_LABELS = {
  [TECHNOLOGY_CATEGORIES.FRONTEND]: "フロントエンド",
  [TECHNOLOGY_CATEGORIES.BACKEND]: "バックエンド",
  [TECHNOLOGY_CATEGORIES.DATABASE]: "データベース",
  [TECHNOLOGY_CATEGORIES.INFRASTRUCTURE]: "インフラ",
  [TECHNOLOGY_CATEGORIES.MOBILE]: "モバイル",
  [TECHNOLOGY_CATEGORIES.DESIGN]: "デザイン",
  [TECHNOLOGY_CATEGORIES.TESTING]: "テスト",
  [TECHNOLOGY_CATEGORIES.TOOLS]: "ツール",
  [TECHNOLOGY_CATEGORIES.OTHER]: "その他",
} as const;

// 技術カテゴリ色
export const TECHNOLOGY_CATEGORY_COLORS = {
  [TECHNOLOGY_CATEGORIES.FRONTEND]: "#f59e0b", // amber
  [TECHNOLOGY_CATEGORIES.BACKEND]: "#3b82f6", // blue
  [TECHNOLOGY_CATEGORIES.DATABASE]: "#22c55e", // green
  [TECHNOLOGY_CATEGORIES.INFRASTRUCTURE]: "#8b5cf6", // violet
  [TECHNOLOGY_CATEGORIES.MOBILE]: "#ef4444", // red
  [TECHNOLOGY_CATEGORIES.DESIGN]: "#ec4899", // pink
  [TECHNOLOGY_CATEGORIES.TESTING]: "#06b6d4", // cyan
  [TECHNOLOGY_CATEGORIES.TOOLS]: "#6b7280", // gray
  [TECHNOLOGY_CATEGORIES.OTHER]: "#84cc16", // lime
} as const;

// 工程
export const PROCESS_TYPES = {
  REQUIREMENT: "requirement",
  DESIGN: "design",
  DEVELOPMENT: "development",
  TESTING: "testing",
  MAINTENANCE: "maintenance",
  MANAGEMENT: "management",
} as const;

// 工程表示名
export const PROCESS_TYPE_LABELS = {
  [PROCESS_TYPES.REQUIREMENT]: "要件定義",
  [PROCESS_TYPES.DESIGN]: "設計",
  [PROCESS_TYPES.DEVELOPMENT]: "開発",
  [PROCESS_TYPES.TESTING]: "テスト",
  [PROCESS_TYPES.MAINTENANCE]: "保守",
  [PROCESS_TYPES.MANAGEMENT]: "管理",
} as const;

// 工程色
export const PROCESS_TYPE_COLORS = {
  [PROCESS_TYPES.REQUIREMENT]: "#3b82f6", // blue
  [PROCESS_TYPES.DESIGN]: "#8b5cf6", // violet
  [PROCESS_TYPES.DEVELOPMENT]: "#22c55e", // green
  [PROCESS_TYPES.TESTING]: "#f59e0b", // amber
  [PROCESS_TYPES.MAINTENANCE]: "#ef4444", // red
  [PROCESS_TYPES.MANAGEMENT]: "#6b7280", // gray
} as const;

// 契約形態
export const CONTRACT_TYPES = {
  FULL_TIME: "full_time",
  PART_TIME: "part_time",
  CONTRACT: "contract",
  FREELANCE: "freelance",
} as const;

// 契約形態表示名
export const CONTRACT_TYPE_LABELS = {
  [CONTRACT_TYPES.FULL_TIME]: "正社員",
  [CONTRACT_TYPES.PART_TIME]: "契約社員",
  [CONTRACT_TYPES.CONTRACT]: "業務委託",
  [CONTRACT_TYPES.FREELANCE]: "フリーランス",
} as const;

// 勤務形態
export const WORK_STYLES = {
  REMOTE: "remote",
  ONSITE: "onsite",
  HYBRID: "hybrid",
} as const;

// 勤務形態表示名
export const WORK_STYLE_LABELS = {
  [WORK_STYLES.REMOTE]: "リモート",
  [WORK_STYLES.ONSITE]: "オンサイト",
  [WORK_STYLES.HYBRID]: "ハイブリッド",
} as const;

// 評価基準
export const EVALUATION_CRITERIA = {
  TECHNICAL_SKILL: "technical_skill",
  COMMUNICATION: "communication",
  PROBLEM_SOLVING: "problem_solving",
  TEAMWORK: "teamwork",
  LEADERSHIP: "leadership",
  LEARNING_ABILITY: "learning_ability",
} as const;

// 評価基準表示名
export const EVALUATION_CRITERIA_LABELS = {
  [EVALUATION_CRITERIA.TECHNICAL_SKILL]: "技術スキル",
  [EVALUATION_CRITERIA.COMMUNICATION]: "コミュニケーション",
  [EVALUATION_CRITERIA.PROBLEM_SOLVING]: "問題解決能力",
  [EVALUATION_CRITERIA.TEAMWORK]: "チームワーク",
  [EVALUATION_CRITERIA.LEADERSHIP]: "リーダーシップ",
  [EVALUATION_CRITERIA.LEARNING_ABILITY]: "学習能力",
} as const;

// 評価スコア
export const EVALUATION_SCORES = {
  POOR: 1,
  BELOW_AVERAGE: 2,
  AVERAGE: 3,
  ABOVE_AVERAGE: 4,
  EXCELLENT: 5,
} as const;

// 評価スコア表示名
export const EVALUATION_SCORE_LABELS = {
  [EVALUATION_SCORES.POOR]: "不十分",
  [EVALUATION_SCORES.BELOW_AVERAGE]: "平均以下",
  [EVALUATION_SCORES.AVERAGE]: "平均",
  [EVALUATION_SCORES.ABOVE_AVERAGE]: "平均以上",
  [EVALUATION_SCORES.EXCELLENT]: "優秀",
} as const;

// 評価スコア色
export const EVALUATION_SCORE_COLORS = {
  [EVALUATION_SCORES.POOR]: "#ef4444", // red
  [EVALUATION_SCORES.BELOW_AVERAGE]: "#f59e0b", // amber
  [EVALUATION_SCORES.AVERAGE]: "#6b7280", // gray
  [EVALUATION_SCORES.ABOVE_AVERAGE]: "#22c55e", // green
  [EVALUATION_SCORES.EXCELLENT]: "#3b82f6", // blue
} as const;

// 月の気分
export const MOOD_TYPES = {
  VERY_GOOD: 5,
  GOOD: 4,
  NEUTRAL: 3,
  BAD: 2,
  VERY_BAD: 1,
} as const;

// 月の気分表示名
export const MOOD_TYPE_LABELS = {
  [MOOD_TYPES.VERY_GOOD]: "とても良い",
  [MOOD_TYPES.GOOD]: "良い",
  [MOOD_TYPES.NEUTRAL]: "普通",
  [MOOD_TYPES.BAD]: "悪い",
  [MOOD_TYPES.VERY_BAD]: "とても悪い",
} as const;

// 月の気分色
export const MOOD_TYPE_COLORS = {
  [MOOD_TYPES.VERY_GOOD]: "#22c55e", // green
  [MOOD_TYPES.GOOD]: "#84cc16", // lime
  [MOOD_TYPES.NEUTRAL]: "#6b7280", // gray
  [MOOD_TYPES.BAD]: "#f59e0b", // amber
  [MOOD_TYPES.VERY_BAD]: "#ef4444", // red
} as const;

// 月の気分絵文字
export const MOOD_TYPE_EMOJIS = {
  [MOOD_TYPES.VERY_GOOD]: "😊",
  [MOOD_TYPES.GOOD]: "🙂",
  [MOOD_TYPES.NEUTRAL]: "😐",
  [MOOD_TYPES.BAD]: "😞",
  [MOOD_TYPES.VERY_BAD]: "😢",
} as const;

// 資格レベル
export const CERTIFICATION_LEVELS = {
  BASIC: "basic",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
  PROFESSIONAL: "professional",
} as const;

// 資格レベル表示名
export const CERTIFICATION_LEVEL_LABELS = {
  [CERTIFICATION_LEVELS.BASIC]: "基本",
  [CERTIFICATION_LEVELS.INTERMEDIATE]: "中級",
  [CERTIFICATION_LEVELS.ADVANCED]: "上級",
  [CERTIFICATION_LEVELS.PROFESSIONAL]: "プロフェッショナル",
} as const;

// 部署
export const DEPARTMENTS = {
  ENGINEERING: "engineering",
  DESIGN: "design",
  SALES: "sales",
  MARKETING: "marketing",
  HR: "hr",
  FINANCE: "finance",
  OPERATIONS: "operations",
} as const;

// 部署表示名
export const DEPARTMENT_LABELS = {
  [DEPARTMENTS.ENGINEERING]: "エンジニアリング",
  [DEPARTMENTS.DESIGN]: "デザイン",
  [DEPARTMENTS.SALES]: "営業",
  [DEPARTMENTS.MARKETING]: "マーケティング",
  [DEPARTMENTS.HR]: "人事",
  [DEPARTMENTS.FINANCE]: "経理",
  [DEPARTMENTS.OPERATIONS]: "オペレーション",
} as const;

// 優先度
export const PRIORITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

// 優先度表示名
export const PRIORITY_LEVEL_LABELS = {
  [PRIORITY_LEVELS.LOW]: "低",
  [PRIORITY_LEVELS.MEDIUM]: "中",
  [PRIORITY_LEVELS.HIGH]: "高",
  [PRIORITY_LEVELS.URGENT]: "緊急",
} as const;

// 優先度色
export const PRIORITY_LEVEL_COLORS = {
  [PRIORITY_LEVELS.LOW]: "#22c55e", // green
  [PRIORITY_LEVELS.MEDIUM]: "#f59e0b", // amber
  [PRIORITY_LEVELS.HIGH]: "#ef4444", // red
  [PRIORITY_LEVELS.URGENT]: "#dc2626", // red-600
} as const;

// フィルタリング用のデフォルト値
export const FILTER_DEFAULTS = {
  PAGE_SIZE: 20,
  SORT_FIELD: "updatedAt",
  SORT_ORDER: "desc",
} as const;

// 検索設定
export const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  DEBOUNCE_DELAY: 300,
  MAX_RESULTS: 100,
} as const;

// バリデーション設定
export const VALIDATION_CONFIG = {
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    PATTERN: /^\d{10,11}$/,
  },
  SKILL_DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  WORK_HISTORY_DESCRIPTION: {
    MAX_LENGTH: 1000,
  },
} as const;

// 型定義
export type EngineerStatus = typeof ENGINEER_STATUS[keyof typeof ENGINEER_STATUS];
export type SkillLevel = typeof SKILL_LEVELS[keyof typeof SKILL_LEVELS];
export type ExperienceRange = typeof EXPERIENCE_RANGES[keyof typeof EXPERIENCE_RANGES];
export type TechnologyCategory = typeof TECHNOLOGY_CATEGORIES[keyof typeof TECHNOLOGY_CATEGORIES];
export type ProcessType = typeof PROCESS_TYPES[keyof typeof PROCESS_TYPES];
export type ContractType = typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES];
export type WorkStyle = typeof WORK_STYLES[keyof typeof WORK_STYLES];
export type EvaluationCriteria = typeof EVALUATION_CRITERIA[keyof typeof EVALUATION_CRITERIA];
export type EvaluationScore = typeof EVALUATION_SCORES[keyof typeof EVALUATION_SCORES];
export type MoodType = typeof MOOD_TYPES[keyof typeof MOOD_TYPES];
export type CertificationLevel = typeof CERTIFICATION_LEVELS[keyof typeof CERTIFICATION_LEVELS];
export type Department = typeof DEPARTMENTS[keyof typeof DEPARTMENTS];
export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS];