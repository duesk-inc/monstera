// デフォルト勤務時間に関する定数定義

// デフォルト勤務時間
export const DEFAULT_WORK_TIME = {
  START_TIME: "09:00",
  END_TIME: "18:00",
  BREAK_TIME: 60, // 分
  WORK_HOURS: 8, // 時間
} as const;

// 勤務時間の選択肢
export const WORK_TIME_OPTIONS = {
  START_TIMES: [
    { value: "08:00", label: "8:00" },
    { value: "08:30", label: "8:30" },
    { value: "09:00", label: "9:00" },
    { value: "09:30", label: "9:30" },
    { value: "10:00", label: "10:00" },
  ],
  END_TIMES: [
    { value: "17:00", label: "17:00" },
    { value: "17:30", label: "17:30" },
    { value: "18:00", label: "18:00" },
    { value: "18:30", label: "18:30" },
    { value: "19:00", label: "19:00" },
    { value: "19:30", label: "19:30" },
    { value: "20:00", label: "20:00" },
  ],
  BREAK_TIMES: [
    { value: 30, label: "30分" },
    { value: 45, label: "45分" },
    { value: 60, label: "60分" },
    { value: 90, label: "90分" },
  ],
} as const;

// 勤務日の種類
export const WORK_DAY_TYPES = {
  REGULAR: "regular",
  OVERTIME: "overtime",
  HOLIDAY: "holiday",
  SICK_LEAVE: "sick_leave",
  VACATION: "vacation",
} as const;

// 勤務日の種類表示名
export const WORK_DAY_TYPE_LABELS = {
  [WORK_DAY_TYPES.REGULAR]: "通常勤務",
  [WORK_DAY_TYPES.OVERTIME]: "残業",
  [WORK_DAY_TYPES.HOLIDAY]: "休日出勤",
  [WORK_DAY_TYPES.SICK_LEAVE]: "病気休暇",
  [WORK_DAY_TYPES.VACATION]: "有給休暇",
} as const;

// 勤務パターン
export const WORK_PATTERNS = {
  FULL_TIME: "full_time",
  PART_TIME: "part_time",
  FLEXIBLE: "flexible",
  SHIFT: "shift",
} as const;

// 勤務パターン表示名
export const WORK_PATTERN_LABELS = {
  [WORK_PATTERNS.FULL_TIME]: "フルタイム",
  [WORK_PATTERNS.PART_TIME]: "パートタイム",
  [WORK_PATTERNS.FLEXIBLE]: "フレックス",
  [WORK_PATTERNS.SHIFT]: "シフト",
} as const;

// 勤務時間の計算に関する定数
export const WORK_TIME_CALCULATION = {
  MINUTES_PER_HOUR: 60,
  WORK_DAYS_PER_WEEK: 5,
  WORK_WEEKS_PER_MONTH: 4.33,
  WORK_MONTHS_PER_YEAR: 12,
} as const;

// 勤務時間の制限
export const WORK_TIME_LIMITS = {
  MIN_WORK_HOURS: 1,
  MAX_WORK_HOURS: 24,
  MIN_BREAK_MINUTES: 0,
  MAX_BREAK_MINUTES: 480, // 8時間
  MAX_OVERTIME_HOURS: 8,
} as const;

// 勤務時間の時間単位
export const TIME_UNITS = {
  MINUTES: "minutes",
  HOURS: "hours",
  DAYS: "days",
} as const;

// 勤務時間の単位表示名
export const TIME_UNIT_LABELS = {
  [TIME_UNITS.MINUTES]: "分",
  [TIME_UNITS.HOURS]: "時間",
  [TIME_UNITS.DAYS]: "日",
} as const;

// 型定義
export type WorkDayType = typeof WORK_DAY_TYPES[keyof typeof WORK_DAY_TYPES];
export type WorkPattern = typeof WORK_PATTERNS[keyof typeof WORK_PATTERNS];
export type TimeUnit = typeof TIME_UNITS[keyof typeof TIME_UNITS];