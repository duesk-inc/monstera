// 気分オプション関連の定数定義

// 気分の選択肢
export const MOOD_OPTIONS = [
  {
    value: 1,
    label: "とても悪い",
    emoji: "😢",
    color: "#ef4444", // red-500
    bgColor: "#fee2e2", // red-100
    description: "非常に落ち込んでいる、やる気が出ない"
  },
  {
    value: 2,
    label: "悪い",
    emoji: "😞",
    color: "#f97316", // orange-500
    bgColor: "#fed7aa", // orange-100
    description: "少し落ち込んでいる、気分が優れない"
  },
  {
    value: 3,
    label: "普通",
    emoji: "😐",
    color: "#6b7280", // gray-500
    bgColor: "#f3f4f6", // gray-100
    description: "特に良くも悪くもない、平常な状態"
  },
  {
    value: 4,
    label: "良い",
    emoji: "🙂",
    color: "#84cc16", // lime-500
    bgColor: "#ecfccb", // lime-100
    description: "気分が良い、やる気がある"
  },
  {
    value: 5,
    label: "とても良い",
    emoji: "😊",
    color: "#22c55e", // green-500
    bgColor: "#dcfce7", // green-100
    description: "非常に気分が良い、とてもやる気がある"
  },
] as const;

// 気分レベルのマッピング
export const MOOD_LEVEL_MAP = {
  1: "very_bad",
  2: "bad",
  3: "neutral",
  4: "good",
  5: "very_good",
} as const;

// 気分レベルの逆マッピング
export const MOOD_LEVEL_REVERSE_MAP = {
  "very_bad": 1,
  "bad": 2,
  "neutral": 3,
  "good": 4,
  "very_good": 5,
} as const;

// 気分の評価基準
export const MOOD_EVALUATION_CRITERIA = {
  VERY_BAD: { min: 1, max: 1, level: "critical" },
  BAD: { min: 2, max: 2, level: "warning" },
  NEUTRAL: { min: 3, max: 3, level: "normal" },
  GOOD: { min: 4, max: 4, level: "positive" },
  VERY_GOOD: { min: 5, max: 5, level: "excellent" },
} as const;

// 気分の統計分析用の設定
export const MOOD_ANALYTICS_CONFIG = {
  TREND_PERIOD_DAYS: 30,
  ALERT_THRESHOLD: 2, // 2以下で警告
  CRITICAL_THRESHOLD: 1, // 1以下で緊急
  ANALYSIS_MINIMUM_DAYS: 7,
  MOVING_AVERAGE_PERIOD: 7,
} as const;

// 気分の改善提案
export const MOOD_IMPROVEMENT_SUGGESTIONS = {
  1: [
    "上司や同僚に相談してみましょう",
    "休憩を取ってリフレッシュしましょう",
    "作業環境を見直してみましょう",
    "健康管理に気を配りましょう",
    "必要に応じて専門家に相談しましょう"
  ],
  2: [
    "作業の優先順位を見直しましょう",
    "チームメンバーと情報共有しましょう",
    "短時間の休憩を取りましょう",
    "タスクを細分化してみましょう"
  ],
  3: [
    "新しいスキルを学んでみましょう",
    "チームとのコミュニケーションを増やしましょう",
    "作業効率を向上させる方法を試してみましょう",
    "目標設定を見直してみましょう"
  ],
  4: [
    "この調子を維持しましょう",
    "経験を後輩に共有しましょう",
    "新しい挑戦をしてみましょう",
    "チームの士気向上に貢献しましょう"
  ],
  5: [
    "素晴らしい状態です！",
    "チームの士気向上に貢献しましょう",
    "この成功要因を記録しておきましょう",
    "他のメンバーのサポートをしましょう"
  ],
} as const;

// 気分の色設定
export const MOOD_COLOR_SCALE = {
  1: {
    primary: "#ef4444",
    secondary: "#dc2626",
    background: "#fee2e2",
    text: "#991b1b",
    border: "#fecaca",
  },
  2: {
    primary: "#f97316",
    secondary: "#ea580c",
    background: "#fed7aa",
    text: "#9a3412",
    border: "#fdba74",
  },
  3: {
    primary: "#6b7280",
    secondary: "#4b5563",
    background: "#f3f4f6",
    text: "#374151",
    border: "#d1d5db",
  },
  4: {
    primary: "#84cc16",
    secondary: "#65a30d",
    background: "#ecfccb",
    text: "#365314",
    border: "#d9f99d",
  },
  5: {
    primary: "#22c55e",
    secondary: "#16a34a",
    background: "#dcfce7",
    text: "#14532d",
    border: "#bbf7d0",
  },
} as const;

// 気分の入力形式
export const MOOD_INPUT_TYPES = {
  SLIDER: "slider",
  BUTTONS: "buttons",
  RADIO: "radio",
  DROPDOWN: "dropdown",
  EMOJI_PICKER: "emoji_picker",
} as const;

// 気分の表示形式
export const MOOD_DISPLAY_TYPES = {
  EMOJI: "emoji",
  COLOR: "color",
  TEXT: "text",
  BADGE: "badge",
  CHART: "chart",
} as const;

// 気分の集計設定
export const MOOD_AGGREGATION_CONFIG = {
  PERIODS: {
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    QUARTERLY: "quarterly",
    YEARLY: "yearly",
  },
  METRICS: {
    AVERAGE: "average",
    MEDIAN: "median",
    MODE: "mode",
    TREND: "trend",
    DISTRIBUTION: "distribution",
  },
} as const;

// 気分の通知設定
export const MOOD_NOTIFICATION_CONFIG = {
  LOW_MOOD_ALERT: {
    enabled: true,
    threshold: 2,
    consecutive_days: 3,
    notify_manager: true,
    notify_hr: true,
  },
  MOOD_IMPROVEMENT: {
    enabled: true,
    threshold: 4,
    show_congratulations: true,
    share_with_team: false,
  },
  REMINDER: {
    enabled: true,
    time: "18:00",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    skip_holidays: true,
  },
} as const;

// 気分の検索・フィルタ設定
export const MOOD_FILTER_CONFIG = {
  RANGES: {
    VERY_LOW: { min: 1, max: 1, label: "とても低い" },
    LOW: { min: 2, max: 2, label: "低い" },
    NORMAL: { min: 3, max: 3, label: "普通" },
    HIGH: { min: 4, max: 4, label: "高い" },
    VERY_HIGH: { min: 5, max: 5, label: "とても高い" },
  },
  DATE_RANGES: {
    LAST_7_DAYS: "last_7_days",
    LAST_30_DAYS: "last_30_days",
    LAST_90_DAYS: "last_90_days",
    THIS_MONTH: "this_month",
    LAST_MONTH: "last_month",
    CUSTOM: "custom",
  },
} as const;

// 気分データの検証設定
export const MOOD_VALIDATION_CONFIG = {
  MIN_VALUE: 1,
  MAX_VALUE: 5,
  REQUIRED: true,
  ALLOW_HALF_POINTS: false,
  ALLOW_DECIMAL: false,
  ALLOW_ZERO: false,
} as const;

// 気分の比較設定
export const MOOD_COMPARISON_CONFIG = {
  BASELINE_PERIOD: 30, // 日
  COMPARISON_THRESHOLDS: {
    SIGNIFICANT_IMPROVEMENT: 0.5,
    SLIGHT_IMPROVEMENT: 0.2,
    NO_CHANGE: 0.1,
    SLIGHT_DECLINE: -0.2,
    SIGNIFICANT_DECLINE: -0.5,
  },
  COMPARISON_LABELS: {
    SIGNIFICANT_IMPROVEMENT: "大幅改善",
    SLIGHT_IMPROVEMENT: "軽微改善",
    NO_CHANGE: "変化なし",
    SLIGHT_DECLINE: "軽微悪化",
    SIGNIFICANT_DECLINE: "大幅悪化",
  },
} as const;

// 型定義
export type MoodOption = typeof MOOD_OPTIONS[number];
export type MoodValue = typeof MOOD_OPTIONS[number]["value"];
export type MoodLevel = typeof MOOD_LEVEL_MAP[keyof typeof MOOD_LEVEL_MAP];
export type MoodInputType = typeof MOOD_INPUT_TYPES[keyof typeof MOOD_INPUT_TYPES];
export type MoodDisplayType = typeof MOOD_DISPLAY_TYPES[keyof typeof MOOD_DISPLAY_TYPES];
export type MoodAggregationPeriod = typeof MOOD_AGGREGATION_CONFIG.PERIODS[keyof typeof MOOD_AGGREGATION_CONFIG.PERIODS];
export type MoodMetric = typeof MOOD_AGGREGATION_CONFIG.METRICS[keyof typeof MOOD_AGGREGATION_CONFIG.METRICS];
export type MoodFilterRange = typeof MOOD_FILTER_CONFIG.RANGES[keyof typeof MOOD_FILTER_CONFIG.RANGES];
export type MoodDateRange = typeof MOOD_FILTER_CONFIG.DATE_RANGES[keyof typeof MOOD_FILTER_CONFIG.DATE_RANGES];

// 気分オプション（エイリアス）
export const moodOptions = MOOD_OPTIONS;

// ユーティリティ関数
export const moodUtils = {
  // 気分値から色を取得
  getColorByValue: (value: MoodValue) => {
    const option = MOOD_OPTIONS.find(opt => opt.value === value);
    return option ? option.color : MOOD_COLOR_SCALE[3].primary;
  },
  
  // 気分値から絵文字を取得
  getEmojiByValue: (value: MoodValue) => {
    const option = MOOD_OPTIONS.find(opt => opt.value === value);
    return option ? option.emoji : "😐";
  },
  
  // 気分値からラベルを取得
  getLabelByValue: (value: MoodValue) => {
    const option = MOOD_OPTIONS.find(opt => opt.value === value);
    return option ? option.label : "不明";
  },
  
  // 気分値から説明を取得
  getDescriptionByValue: (value: MoodValue) => {
    const option = MOOD_OPTIONS.find(opt => opt.value === value);
    return option ? option.description : "";
  },
  
  // 気分値から改善提案を取得
  getSuggestionsByValue: (value: MoodValue) => {
    return MOOD_IMPROVEMENT_SUGGESTIONS[value] || [];
  },
  
  // 気分値が警告レベルかチェック
  isLowMood: (value: MoodValue) => {
    return value <= MOOD_ANALYTICS_CONFIG.ALERT_THRESHOLD;
  },
  
  // 気分値が緊急レベルかチェック
  isCriticalMood: (value: MoodValue) => {
    return value <= MOOD_ANALYTICS_CONFIG.CRITICAL_THRESHOLD;
  },
  
  // 気分値の配列から平均を計算
  calculateAverage: (values: MoodValue[]) => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  },
  
  // 気分値の配列から中央値を計算
  calculateMedian: (values: MoodValue[]) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[middle - 1] + sorted[middle]) / 2 
      : sorted[middle];
  },
};