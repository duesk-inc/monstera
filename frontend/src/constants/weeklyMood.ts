// 週の気分・コンディション関連の定数定義

// 気分のレベル
export const MOOD_LEVELS = {
  VERY_BAD: 1,
  BAD: 2,
  NEUTRAL: 3,
  GOOD: 4,
  VERY_GOOD: 5,
} as const;

// 気分のレベル表示名
export const MOOD_LEVEL_LABELS = {
  [MOOD_LEVELS.VERY_BAD]: "とても悪い",
  [MOOD_LEVELS.BAD]: "悪い",
  [MOOD_LEVELS.NEUTRAL]: "普通",
  [MOOD_LEVELS.GOOD]: "良い",
  [MOOD_LEVELS.VERY_GOOD]: "とても良い",
} as const;

// 気分のレベル色
export const MOOD_LEVEL_COLORS = {
  [MOOD_LEVELS.VERY_BAD]: "#ef4444", // red-500
  [MOOD_LEVELS.BAD]: "#f97316", // orange-500
  [MOOD_LEVELS.NEUTRAL]: "#6b7280", // gray-500
  [MOOD_LEVELS.GOOD]: "#84cc16", // lime-500
  [MOOD_LEVELS.VERY_GOOD]: "#22c55e", // green-500
} as const;

// 気分の絵文字
export const MOOD_LEVEL_EMOJIS = {
  [MOOD_LEVELS.VERY_BAD]: "😢",
  [MOOD_LEVELS.BAD]: "😞",
  [MOOD_LEVELS.NEUTRAL]: "😐",
  [MOOD_LEVELS.GOOD]: "🙂",
  [MOOD_LEVELS.VERY_GOOD]: "😊",
} as const;

// 気分の背景色（薄い色）
export const MOOD_LEVEL_BG_COLORS = {
  [MOOD_LEVELS.VERY_BAD]: "#fee2e2", // red-100
  [MOOD_LEVELS.BAD]: "#fed7aa", // orange-100
  [MOOD_LEVELS.NEUTRAL]: "#f3f4f6", // gray-100
  [MOOD_LEVELS.GOOD]: "#ecfccb", // lime-100
  [MOOD_LEVELS.VERY_GOOD]: "#dcfce7", // green-100
} as const;

// 気分の要因カテゴリ
export const MOOD_FACTOR_CATEGORIES = {
  WORK_LOAD: "work_load",
  TEAM_RELATIONSHIP: "team_relationship",
  PROJECT_PROGRESS: "project_progress",
  TECHNICAL_CHALLENGE: "technical_challenge",
  WORK_ENVIRONMENT: "work_environment",
  PERSONAL_GROWTH: "personal_growth",
  WORK_LIFE_BALANCE: "work_life_balance",
  HEALTH: "health",
  OTHER: "other",
} as const;

// 気分の要因カテゴリ表示名
export const MOOD_FACTOR_CATEGORY_LABELS = {
  [MOOD_FACTOR_CATEGORIES.WORK_LOAD]: "作業負荷",
  [MOOD_FACTOR_CATEGORIES.TEAM_RELATIONSHIP]: "チーム関係",
  [MOOD_FACTOR_CATEGORIES.PROJECT_PROGRESS]: "プロジェクト進捗",
  [MOOD_FACTOR_CATEGORIES.TECHNICAL_CHALLENGE]: "技術的課題",
  [MOOD_FACTOR_CATEGORIES.WORK_ENVIRONMENT]: "作業環境",
  [MOOD_FACTOR_CATEGORIES.PERSONAL_GROWTH]: "個人成長",
  [MOOD_FACTOR_CATEGORIES.WORK_LIFE_BALANCE]: "ワークライフバランス",
  [MOOD_FACTOR_CATEGORIES.HEALTH]: "健康状態",
  [MOOD_FACTOR_CATEGORIES.OTHER]: "その他",
} as const;

// 気分の要因カテゴリ色
export const MOOD_FACTOR_CATEGORY_COLORS = {
  [MOOD_FACTOR_CATEGORIES.WORK_LOAD]: "#3b82f6", // blue-500
  [MOOD_FACTOR_CATEGORIES.TEAM_RELATIONSHIP]: "#ec4899", // pink-500
  [MOOD_FACTOR_CATEGORIES.PROJECT_PROGRESS]: "#22c55e", // green-500
  [MOOD_FACTOR_CATEGORIES.TECHNICAL_CHALLENGE]: "#f59e0b", // amber-500
  [MOOD_FACTOR_CATEGORIES.WORK_ENVIRONMENT]: "#8b5cf6", // violet-500
  [MOOD_FACTOR_CATEGORIES.PERSONAL_GROWTH]: "#06b6d4", // cyan-500
  [MOOD_FACTOR_CATEGORIES.WORK_LIFE_BALANCE]: "#84cc16", // lime-500
  [MOOD_FACTOR_CATEGORIES.HEALTH]: "#ef4444", // red-500
  [MOOD_FACTOR_CATEGORIES.OTHER]: "#6b7280", // gray-500
} as const;

// ストレスレベル
export const STRESS_LEVELS = {
  NONE: 0,
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  VERY_HIGH: 4,
} as const;

// ストレスレベル表示名
export const STRESS_LEVEL_LABELS = {
  [STRESS_LEVELS.NONE]: "なし",
  [STRESS_LEVELS.LOW]: "低い",
  [STRESS_LEVELS.MODERATE]: "普通",
  [STRESS_LEVELS.HIGH]: "高い",
  [STRESS_LEVELS.VERY_HIGH]: "非常に高い",
} as const;

// ストレスレベル色
export const STRESS_LEVEL_COLORS = {
  [STRESS_LEVELS.NONE]: "#22c55e", // green-500
  [STRESS_LEVELS.LOW]: "#84cc16", // lime-500
  [STRESS_LEVELS.MODERATE]: "#f59e0b", // amber-500
  [STRESS_LEVELS.HIGH]: "#f97316", // orange-500
  [STRESS_LEVELS.VERY_HIGH]: "#ef4444", // red-500
} as const;

// 疲労度レベル
export const FATIGUE_LEVELS = {
  NONE: 0,
  SLIGHT: 1,
  MODERATE: 2,
  SEVERE: 3,
  EXTREME: 4,
} as const;

// 疲労度レベル表示名
export const FATIGUE_LEVEL_LABELS = {
  [FATIGUE_LEVELS.NONE]: "なし",
  [FATIGUE_LEVELS.SLIGHT]: "軽い",
  [FATIGUE_LEVELS.MODERATE]: "普通",
  [FATIGUE_LEVELS.SEVERE]: "重い",
  [FATIGUE_LEVELS.EXTREME]: "極度",
} as const;

// 疲労度レベル色
export const FATIGUE_LEVEL_COLORS = {
  [FATIGUE_LEVELS.NONE]: "#22c55e", // green-500
  [FATIGUE_LEVELS.SLIGHT]: "#84cc16", // lime-500
  [FATIGUE_LEVELS.MODERATE]: "#f59e0b", // amber-500
  [FATIGUE_LEVELS.SEVERE]: "#f97316", // orange-500
  [FATIGUE_LEVELS.EXTREME]: "#ef4444", // red-500
} as const;

// 集中度レベル
export const CONCENTRATION_LEVELS = {
  VERY_LOW: 1,
  LOW: 2,
  NORMAL: 3,
  HIGH: 4,
  VERY_HIGH: 5,
} as const;

// 集中度レベル表示名
export const CONCENTRATION_LEVEL_LABELS = {
  [CONCENTRATION_LEVELS.VERY_LOW]: "とても低い",
  [CONCENTRATION_LEVELS.LOW]: "低い",
  [CONCENTRATION_LEVELS.NORMAL]: "普通",
  [CONCENTRATION_LEVELS.HIGH]: "高い",
  [CONCENTRATION_LEVELS.VERY_HIGH]: "とても高い",
} as const;

// 集中度レベル色
export const CONCENTRATION_LEVEL_COLORS = {
  [CONCENTRATION_LEVELS.VERY_LOW]: "#ef4444", // red-500
  [CONCENTRATION_LEVELS.LOW]: "#f97316", // orange-500
  [CONCENTRATION_LEVELS.NORMAL]: "#f59e0b", // amber-500
  [CONCENTRATION_LEVELS.HIGH]: "#84cc16", // lime-500
  [CONCENTRATION_LEVELS.VERY_HIGH]: "#22c55e", // green-500
} as const;

// 満足度レベル
export const SATISFACTION_LEVELS = {
  VERY_DISSATISFIED: 1,
  DISSATISFIED: 2,
  NEUTRAL: 3,
  SATISFIED: 4,
  VERY_SATISFIED: 5,
} as const;

// 満足度レベル表示名
export const SATISFACTION_LEVEL_LABELS = {
  [SATISFACTION_LEVELS.VERY_DISSATISFIED]: "非常に不満",
  [SATISFACTION_LEVELS.DISSATISFIED]: "不満",
  [SATISFACTION_LEVELS.NEUTRAL]: "普通",
  [SATISFACTION_LEVELS.SATISFIED]: "満足",
  [SATISFACTION_LEVELS.VERY_SATISFIED]: "非常に満足",
} as const;

// 満足度レベル色
export const SATISFACTION_LEVEL_COLORS = {
  [SATISFACTION_LEVELS.VERY_DISSATISFIED]: "#ef4444", // red-500
  [SATISFACTION_LEVELS.DISSATISFIED]: "#f97316", // orange-500
  [SATISFACTION_LEVELS.NEUTRAL]: "#6b7280", // gray-500
  [SATISFACTION_LEVELS.SATISFIED]: "#84cc16", // lime-500
  [SATISFACTION_LEVELS.VERY_SATISFIED]: "#22c55e", // green-500
} as const;

// 気分の追跡設定
export const MOOD_TRACKING_SETTINGS = {
  ENABLED: true,
  FREQUENCY: "daily", // daily, weekly
  REMIND_TIME: "18:00",
  REQUIRED_FIELDS: ["mood", "stress", "fatigue"],
  OPTIONAL_FIELDS: ["concentration", "satisfaction", "factors"],
} as const;

// 気分の分析設定
export const MOOD_ANALYSIS_SETTINGS = {
  TREND_PERIOD: 30, // 日
  ALERT_THRESHOLD: {
    MOOD: MOOD_LEVELS.BAD,
    STRESS: STRESS_LEVELS.HIGH,
    FATIGUE: FATIGUE_LEVELS.SEVERE,
  },
  NOTIFICATION_ENABLED: true,
  MANAGER_NOTIFICATION_ENABLED: true,
} as const;

// 気分の表示設定
export const MOOD_DISPLAY_SETTINGS = {
  SHOW_EMOJI: true,
  SHOW_COLOR: true,
  SHOW_TREND: true,
  SHOW_AVERAGE: true,
  CHART_TYPE: "line", // line, bar, area
  DATE_RANGE: 30, // 日
} as const;

// 気分の改善提案
export const MOOD_IMPROVEMENT_SUGGESTIONS = {
  [MOOD_LEVELS.VERY_BAD]: [
    "休憩を取ってリフレッシュしましょう",
    "上司や同僚に相談してみましょう",
    "作業環境を整えてみましょう",
    "健康管理に気を使いましょう",
  ],
  [MOOD_LEVELS.BAD]: [
    "作業の優先順位を見直しましょう",
    "チームメンバーと情報共有しましょう",
    "短時間の休憩を取りましょう",
  ],
  [MOOD_LEVELS.NEUTRAL]: [
    "新しいスキルを学んでみましょう",
    "チームとのコミュニケーションを増やしましょう",
    "作業効率を向上させる方法を試してみましょう",
  ],
  [MOOD_LEVELS.GOOD]: [
    "この調子を維持しましょう",
    "経験を後輩に共有しましょう",
    "新しい挑戦をしてみましょう",
  ],
  [MOOD_LEVELS.VERY_GOOD]: [
    "素晴らしい状態です！",
    "チームの士気向上に貢献しましょう",
    "この成功要因を記録しておきましょう",
  ],
} as const;

// 週報気分設定（エイリアス）
export const WEEKLY_REPORT_MOOD = {
  VERY_BAD: MOOD_LEVELS.VERY_BAD,
  BAD: MOOD_LEVELS.BAD,
  NEUTRAL: MOOD_LEVELS.NEUTRAL,
  GOOD: MOOD_LEVELS.GOOD,
  VERY_GOOD: MOOD_LEVELS.VERY_GOOD,
} as const;

// 週報気分マッピング
export const WEEKLY_REPORT_MOOD_MAP = {
  [WEEKLY_REPORT_MOOD.VERY_BAD]: {
    label: MOOD_LEVEL_LABELS[MOOD_LEVELS.VERY_BAD],
    color: MOOD_LEVEL_COLORS[MOOD_LEVELS.VERY_BAD],
    emoji: MOOD_LEVEL_EMOJIS[MOOD_LEVELS.VERY_BAD],
    bgColor: MOOD_LEVEL_BG_COLORS[MOOD_LEVELS.VERY_BAD],
    suggestions: MOOD_IMPROVEMENT_SUGGESTIONS[MOOD_LEVELS.VERY_BAD],
  },
  [WEEKLY_REPORT_MOOD.BAD]: {
    label: MOOD_LEVEL_LABELS[MOOD_LEVELS.BAD],
    color: MOOD_LEVEL_COLORS[MOOD_LEVELS.BAD],
    emoji: MOOD_LEVEL_EMOJIS[MOOD_LEVELS.BAD],
    bgColor: MOOD_LEVEL_BG_COLORS[MOOD_LEVELS.BAD],
    suggestions: MOOD_IMPROVEMENT_SUGGESTIONS[MOOD_LEVELS.BAD],
  },
  [WEEKLY_REPORT_MOOD.NEUTRAL]: {
    label: MOOD_LEVEL_LABELS[MOOD_LEVELS.NEUTRAL],
    color: MOOD_LEVEL_COLORS[MOOD_LEVELS.NEUTRAL],
    emoji: MOOD_LEVEL_EMOJIS[MOOD_LEVELS.NEUTRAL],
    bgColor: MOOD_LEVEL_BG_COLORS[MOOD_LEVELS.NEUTRAL],
    suggestions: MOOD_IMPROVEMENT_SUGGESTIONS[MOOD_LEVELS.NEUTRAL],
  },
  [WEEKLY_REPORT_MOOD.GOOD]: {
    label: MOOD_LEVEL_LABELS[MOOD_LEVELS.GOOD],
    color: MOOD_LEVEL_COLORS[MOOD_LEVELS.GOOD],
    emoji: MOOD_LEVEL_EMOJIS[MOOD_LEVELS.GOOD],
    bgColor: MOOD_LEVEL_BG_COLORS[MOOD_LEVELS.GOOD],
    suggestions: MOOD_IMPROVEMENT_SUGGESTIONS[MOOD_LEVELS.GOOD],
  },
  [WEEKLY_REPORT_MOOD.VERY_GOOD]: {
    label: MOOD_LEVEL_LABELS[MOOD_LEVELS.VERY_GOOD],
    color: MOOD_LEVEL_COLORS[MOOD_LEVELS.VERY_GOOD],
    emoji: MOOD_LEVEL_EMOJIS[MOOD_LEVELS.VERY_GOOD],
    bgColor: MOOD_LEVEL_BG_COLORS[MOOD_LEVELS.VERY_GOOD],
    suggestions: MOOD_IMPROVEMENT_SUGGESTIONS[MOOD_LEVELS.VERY_GOOD],
  },
} as const;

// 型定義
export type MoodLevel = typeof MOOD_LEVELS[keyof typeof MOOD_LEVELS];
export type MoodFactorCategory = typeof MOOD_FACTOR_CATEGORIES[keyof typeof MOOD_FACTOR_CATEGORIES];
export type StressLevel = typeof STRESS_LEVELS[keyof typeof STRESS_LEVELS];
export type FatigueLevel = typeof FATIGUE_LEVELS[keyof typeof FATIGUE_LEVELS];
export type ConcentrationLevel = typeof CONCENTRATION_LEVELS[keyof typeof CONCENTRATION_LEVELS];
export type SatisfactionLevel = typeof SATISFACTION_LEVELS[keyof typeof SATISFACTION_LEVELS];
export type WeeklyReportMood = typeof WEEKLY_REPORT_MOOD[keyof typeof WEEKLY_REPORT_MOOD];