// 週報の気分の定数定義
export const WEEKLY_REPORT_MOOD = {
  TERRIBLE: 1,   // サイテー
  BAD: 2,        // イマイチ
  NEUTRAL: 3,    // ふつう
  GOOD: 4,       // イイ感じ
  EXCELLENT: 5,  // サイコー
} as const;

// 表示用ラベル
export const WEEKLY_REPORT_MOOD_LABEL = {
  [WEEKLY_REPORT_MOOD.TERRIBLE]: 'サイテー',
  [WEEKLY_REPORT_MOOD.BAD]: 'イマイチ',
  [WEEKLY_REPORT_MOOD.NEUTRAL]: 'ふつう',
  [WEEKLY_REPORT_MOOD.GOOD]: 'イイ感じ',
  [WEEKLY_REPORT_MOOD.EXCELLENT]: 'サイコー',
} as const;

// 旧値と新値のマッピング（移行期間用）
export const WEEKLY_REPORT_MOOD_MAP = {
  'veryBad': WEEKLY_REPORT_MOOD.TERRIBLE,
  'bad': WEEKLY_REPORT_MOOD.BAD,
  'neutral': WEEKLY_REPORT_MOOD.NEUTRAL,
  'good': WEEKLY_REPORT_MOOD.GOOD,
  'veryGood': WEEKLY_REPORT_MOOD.EXCELLENT,
} as const;

// 気分型の定義
export type WeeklyReportMoodType = typeof WEEKLY_REPORT_MOOD[keyof typeof WEEKLY_REPORT_MOOD];

// Phase 1: 文字列ベースのムード定数（新規追加）
export const WEEKLY_REPORT_MOOD_STRING = {
  TERRIBLE: 'terrible',
  BAD: 'bad',
  NEUTRAL: 'neutral',
  GOOD: 'good',
  EXCELLENT: 'excellent',
} as const;

// Phase 1: 文字列ムード用のラベル（新規追加）
export const WEEKLY_REPORT_MOOD_STRING_LABEL = {
  [WEEKLY_REPORT_MOOD_STRING.TERRIBLE]: 'サイテー',
  [WEEKLY_REPORT_MOOD_STRING.BAD]: 'イマイチ',
  [WEEKLY_REPORT_MOOD_STRING.NEUTRAL]: 'ふつう',
  [WEEKLY_REPORT_MOOD_STRING.GOOD]: 'イイ感じ',
  [WEEKLY_REPORT_MOOD_STRING.EXCELLENT]: 'サイコー',
} as const;

// 文字列ムード型の定義
export type WeeklyReportMoodStringType = typeof WEEKLY_REPORT_MOOD_STRING[keyof typeof WEEKLY_REPORT_MOOD_STRING];

// Phase 1: ムード変換ユーティリティ
export const convertIntMoodToString = (mood: number): WeeklyReportMoodStringType => {
  switch (mood) {
    case 1: return WEEKLY_REPORT_MOOD_STRING.TERRIBLE;
    case 2: return WEEKLY_REPORT_MOOD_STRING.BAD;
    case 3: return WEEKLY_REPORT_MOOD_STRING.NEUTRAL;
    case 4: return WEEKLY_REPORT_MOOD_STRING.GOOD;
    case 5: return WEEKLY_REPORT_MOOD_STRING.EXCELLENT;
    default: return WEEKLY_REPORT_MOOD_STRING.NEUTRAL;
  }
};

export const convertStringMoodToInt = (mood: string): WeeklyReportMoodType => {
  switch (mood) {
    case 'terrible': return WEEKLY_REPORT_MOOD.TERRIBLE;
    case 'bad': return WEEKLY_REPORT_MOOD.BAD;
    case 'neutral': return WEEKLY_REPORT_MOOD.NEUTRAL;
    case 'good': return WEEKLY_REPORT_MOOD.GOOD;
    case 'excellent': return WEEKLY_REPORT_MOOD.EXCELLENT;
    default: return WEEKLY_REPORT_MOOD.NEUTRAL;
  }
}; 