// 日付関連の定数定義

// 日付フォーマット
export const DATE_FORMATS = {
  YYYY_MM_DD: "YYYY-MM-DD",
  YYYY_MM_DD_HH_MM: "YYYY-MM-DD HH:mm",
  YYYY_MM_DD_HH_MM_SS: "YYYY-MM-DD HH:mm:ss",
  MM_DD_YYYY: "MM/DD/YYYY",
  DD_MM_YYYY: "DD/MM/YYYY",
  YYYY_MM: "YYYY-MM",
  MM_DD: "MM-DD",
  HH_MM: "HH:mm",
  HH_MM_SS: "HH:mm:ss",
  
  // 日本語フォーマット
  YYYY年MM月DD日: "YYYY年MM月DD日",
  MM月DD日: "MM月DD日",
  HH時MM分: "HH時MM分",
  
  // 相対フォーマット
  RELATIVE: "relative",
  RELATIVE_TIME: "relative_time",
  
  // ISO フォーマット
  ISO_DATE: "YYYY-MM-DD",
  ISO_DATETIME: "YYYY-MM-DDTHH:mm:ss.SSSZ",
  ISO_TIME: "HH:mm:ss",
} as const;

// 曜日
export const WEEKDAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

// 曜日表示名（短縮）
export const WEEKDAY_SHORT_LABELS = {
  [WEEKDAYS.SUNDAY]: "日",
  [WEEKDAYS.MONDAY]: "月",
  [WEEKDAYS.TUESDAY]: "火",
  [WEEKDAYS.WEDNESDAY]: "水",
  [WEEKDAYS.THURSDAY]: "木",
  [WEEKDAYS.FRIDAY]: "金",
  [WEEKDAYS.SATURDAY]: "土",
} as const;

// 曜日表示名（完全）
export const WEEKDAY_FULL_LABELS = {
  [WEEKDAYS.SUNDAY]: "日曜日",
  [WEEKDAYS.MONDAY]: "月曜日",
  [WEEKDAYS.TUESDAY]: "火曜日",
  [WEEKDAYS.WEDNESDAY]: "水曜日",
  [WEEKDAYS.THURSDAY]: "木曜日",
  [WEEKDAYS.FRIDAY]: "金曜日",
  [WEEKDAYS.SATURDAY]: "土曜日",
} as const;

// 曜日表示名（英語短縮）
export const WEEKDAY_EN_SHORT_LABELS = {
  [WEEKDAYS.SUNDAY]: "Sun",
  [WEEKDAYS.MONDAY]: "Mon",
  [WEEKDAYS.TUESDAY]: "Tue",
  [WEEKDAYS.WEDNESDAY]: "Wed",
  [WEEKDAYS.THURSDAY]: "Thu",
  [WEEKDAYS.FRIDAY]: "Fri",
  [WEEKDAYS.SATURDAY]: "Sat",
} as const;

// 月
export const MONTHS = {
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  MAY: 5,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
} as const;

// 月表示名（短縮）
export const MONTH_SHORT_LABELS = {
  [MONTHS.JANUARY]: "1月",
  [MONTHS.FEBRUARY]: "2月",
  [MONTHS.MARCH]: "3月",
  [MONTHS.APRIL]: "4月",
  [MONTHS.MAY]: "5月",
  [MONTHS.JUNE]: "6月",
  [MONTHS.JULY]: "7月",
  [MONTHS.AUGUST]: "8月",
  [MONTHS.SEPTEMBER]: "9月",
  [MONTHS.OCTOBER]: "10月",
  [MONTHS.NOVEMBER]: "11月",
  [MONTHS.DECEMBER]: "12月",
} as const;

// 月表示名（英語短縮）
export const MONTH_EN_SHORT_LABELS = {
  [MONTHS.JANUARY]: "Jan",
  [MONTHS.FEBRUARY]: "Feb",
  [MONTHS.MARCH]: "Mar",
  [MONTHS.APRIL]: "Apr",
  [MONTHS.MAY]: "May",
  [MONTHS.JUNE]: "Jun",
  [MONTHS.JULY]: "Jul",
  [MONTHS.AUGUST]: "Aug",
  [MONTHS.SEPTEMBER]: "Sep",
  [MONTHS.OCTOBER]: "Oct",
  [MONTHS.NOVEMBER]: "Nov",
  [MONTHS.DECEMBER]: "Dec",
} as const;

// 四半期
export const QUARTERS = {
  Q1: 1,
  Q2: 2,
  Q3: 3,
  Q4: 4,
} as const;

// 四半期表示名
export const QUARTER_LABELS = {
  [QUARTERS.Q1]: "第1四半期",
  [QUARTERS.Q2]: "第2四半期",
  [QUARTERS.Q3]: "第3四半期",
  [QUARTERS.Q4]: "第4四半期",
} as const;

// 四半期の月
export const QUARTER_MONTHS = {
  [QUARTERS.Q1]: [MONTHS.JANUARY, MONTHS.FEBRUARY, MONTHS.MARCH],
  [QUARTERS.Q2]: [MONTHS.APRIL, MONTHS.MAY, MONTHS.JUNE],
  [QUARTERS.Q3]: [MONTHS.JULY, MONTHS.AUGUST, MONTHS.SEPTEMBER],
  [QUARTERS.Q4]: [MONTHS.OCTOBER, MONTHS.NOVEMBER, MONTHS.DECEMBER],
} as const;

// 時間の単位
export const TIME_UNITS = {
  MILLISECOND: "millisecond",
  SECOND: "second",
  MINUTE: "minute",
  HOUR: "hour",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
} as const;

// 時間の単位表示名
export const TIME_UNIT_LABELS = {
  [TIME_UNITS.MILLISECOND]: "ミリ秒",
  [TIME_UNITS.SECOND]: "秒",
  [TIME_UNITS.MINUTE]: "分",
  [TIME_UNITS.HOUR]: "時間",
  [TIME_UNITS.DAY]: "日",
  [TIME_UNITS.WEEK]: "週",
  [TIME_UNITS.MONTH]: "月",
  [TIME_UNITS.QUARTER]: "四半期",
  [TIME_UNITS.YEAR]: "年",
} as const;

// 時間の単位（複数形）
export const TIME_UNIT_PLURAL_LABELS = {
  [TIME_UNITS.MILLISECOND]: "ミリ秒",
  [TIME_UNITS.SECOND]: "秒",
  [TIME_UNITS.MINUTE]: "分",
  [TIME_UNITS.HOUR]: "時間",
  [TIME_UNITS.DAY]: "日",
  [TIME_UNITS.WEEK]: "週",
  [TIME_UNITS.MONTH]: "ヶ月",
  [TIME_UNITS.QUARTER]: "四半期",
  [TIME_UNITS.YEAR]: "年",
} as const;

// 相対時間の表示設定
export const RELATIVE_TIME_CONFIG = {
  JUST_NOW_THRESHOLD: 60, // 1分以内は「たった今」
  MINUTES_THRESHOLD: 60, // 1時間以内は「○分前」
  HOURS_THRESHOLD: 24, // 24時間以内は「○時間前」
  DAYS_THRESHOLD: 7, // 7日以内は「○日前」
  WEEKS_THRESHOLD: 4, // 4週間以内は「○週間前」
  MONTHS_THRESHOLD: 12, // 12ヶ月以内は「○ヶ月前」
} as const;

// 日付の範囲
export const DATE_RANGES = {
  TODAY: "today",
  YESTERDAY: "yesterday",
  LAST_7_DAYS: "last_7_days",
  LAST_30_DAYS: "last_30_days",
  THIS_WEEK: "this_week",
  LAST_WEEK: "last_week",
  THIS_MONTH: "this_month",
  LAST_MONTH: "last_month",
  THIS_QUARTER: "this_quarter",
  LAST_QUARTER: "last_quarter",
  THIS_YEAR: "this_year",
  LAST_YEAR: "last_year",
  CUSTOM: "custom",
} as const;

// 日付の範囲表示名
export const DATE_RANGE_LABELS = {
  [DATE_RANGES.TODAY]: "今日",
  [DATE_RANGES.YESTERDAY]: "昨日",
  [DATE_RANGES.LAST_7_DAYS]: "過去7日",
  [DATE_RANGES.LAST_30_DAYS]: "過去30日",
  [DATE_RANGES.THIS_WEEK]: "今週",
  [DATE_RANGES.LAST_WEEK]: "先週",
  [DATE_RANGES.THIS_MONTH]: "今月",
  [DATE_RANGES.LAST_MONTH]: "先月",
  [DATE_RANGES.THIS_QUARTER]: "今四半期",
  [DATE_RANGES.LAST_QUARTER]: "前四半期",
  [DATE_RANGES.THIS_YEAR]: "今年",
  [DATE_RANGES.LAST_YEAR]: "昨年",
  [DATE_RANGES.CUSTOM]: "カスタム",
} as const;

// 営業日の設定
export const BUSINESS_DAYS = {
  WEEKDAYS: [
    WEEKDAYS.MONDAY,
    WEEKDAYS.TUESDAY,
    WEEKDAYS.WEDNESDAY,
    WEEKDAYS.THURSDAY,
    WEEKDAYS.FRIDAY,
  ],
  WEEKENDS: [WEEKDAYS.SATURDAY, WEEKDAYS.SUNDAY],
} as const;

// 営業時間の設定
export const BUSINESS_HOURS = {
  START_HOUR: 9,
  END_HOUR: 18,
  LUNCH_START_HOUR: 12,
  LUNCH_END_HOUR: 13,
  BREAK_MINUTES: 60,
} as const;

// 祝日の種類
export const HOLIDAY_TYPES = {
  NATIONAL: "national",
  COMPANY: "company",
  PERSONAL: "personal",
  REGIONAL: "regional",
} as const;

// 祝日の種類表示名
export const HOLIDAY_TYPE_LABELS = {
  [HOLIDAY_TYPES.NATIONAL]: "国民の祝日",
  [HOLIDAY_TYPES.COMPANY]: "会社休日",
  [HOLIDAY_TYPES.PERSONAL]: "個人休暇",
  [HOLIDAY_TYPES.REGIONAL]: "地域休日",
} as const;

// タイムゾーン
export const TIMEZONES = {
  JST: "Asia/Tokyo",
  UTC: "UTC",
  EST: "America/New_York",
  PST: "America/Los_Angeles",
  GMT: "Europe/London",
  CET: "Europe/Paris",
  CST: "Asia/Shanghai",
  KST: "Asia/Seoul",
} as const;

// タイムゾーン表示名
export const TIMEZONE_LABELS = {
  [TIMEZONES.JST]: "日本標準時 (JST)",
  [TIMEZONES.UTC]: "協定世界時 (UTC)",
  [TIMEZONES.EST]: "東部標準時 (EST)",
  [TIMEZONES.PST]: "太平洋標準時 (PST)",
  [TIMEZONES.GMT]: "グリニッジ標準時 (GMT)",
  [TIMEZONES.CET]: "中央ヨーロッパ時間 (CET)",
  [TIMEZONES.CST]: "中国標準時 (CST)",
  [TIMEZONES.KST]: "韓国標準時 (KST)",
} as const;

// デフォルトの設定
export const DEFAULT_DATE_CONFIG = {
  LOCALE: "ja-JP",
  TIMEZONE: TIMEZONES.JST,
  FIRST_DAY_OF_WEEK: WEEKDAYS.MONDAY,
  DATE_FORMAT: DATE_FORMATS.YYYY_MM_DD,
  TIME_FORMAT: DATE_FORMATS.HH_MM,
  DATETIME_FORMAT: DATE_FORMATS.YYYY_MM_DD_HH_MM,
  SHOW_RELATIVE_TIME: true,
  SHOW_WEEKDAY: true,
  SHOW_TIME: true,
} as const;

// 日付の検証設定
export const DATE_VALIDATION = {
  MIN_YEAR: 1900,
  MAX_YEAR: 2100,
  MIN_MONTH: 1,
  MAX_MONTH: 12,
  MIN_DAY: 1,
  MAX_DAY: 31,
  MIN_HOUR: 0,
  MAX_HOUR: 23,
  MIN_MINUTE: 0,
  MAX_MINUTE: 59,
  MIN_SECOND: 0,
  MAX_SECOND: 59,
} as const;

// キャリア最小日付を取得する関数
export const getCareerMinDate = (): string => {
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 50; // 50年前を最小とする
  return `${minYear}-01-01`;
};

// 型定義
export type DateFormat = typeof DATE_FORMATS[keyof typeof DATE_FORMATS];
export type Weekday = typeof WEEKDAYS[keyof typeof WEEKDAYS];
export type Month = typeof MONTHS[keyof typeof MONTHS];
export type Quarter = typeof QUARTERS[keyof typeof QUARTERS];
export type TimeUnit = typeof TIME_UNITS[keyof typeof TIME_UNITS];
export type DateRange = typeof DATE_RANGES[keyof typeof DATE_RANGES];
export type HolidayType = typeof HOLIDAY_TYPES[keyof typeof HOLIDAY_TYPES];
export type Timezone = typeof TIMEZONES[keyof typeof TIMEZONES];