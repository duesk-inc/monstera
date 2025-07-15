/**
 * デフォルト勤務時間の定数
 * ユーザーごとのデフォルト設定が存在しない場合のみ使用される
 */
export const DEFAULT_WORK_TIME = {
  /** デフォルト出勤時間 */
  START: '09:00',
  /** デフォルト退勤時間 */
  END: '18:00',
  /** デフォルト休憩時間（時間） */
  BREAK: 1.0,
} as const;

/**
 * カスタム曜日設定のデフォルト値
 */
export const DEFAULT_CUSTOM_DAY_SETTINGS = {
  monday: { enabled: false, startTime: DEFAULT_WORK_TIME.START, endTime: DEFAULT_WORK_TIME.END, breakTime: DEFAULT_WORK_TIME.BREAK },
  tuesday: { enabled: false, startTime: DEFAULT_WORK_TIME.START, endTime: DEFAULT_WORK_TIME.END, breakTime: DEFAULT_WORK_TIME.BREAK },
  wednesday: { enabled: false, startTime: DEFAULT_WORK_TIME.START, endTime: DEFAULT_WORK_TIME.END, breakTime: DEFAULT_WORK_TIME.BREAK },
  thursday: { enabled: false, startTime: DEFAULT_WORK_TIME.START, endTime: DEFAULT_WORK_TIME.END, breakTime: DEFAULT_WORK_TIME.BREAK },
  friday: { enabled: false, startTime: DEFAULT_WORK_TIME.START, endTime: DEFAULT_WORK_TIME.END, breakTime: DEFAULT_WORK_TIME.BREAK },
  saturday: { enabled: false, startTime: '', endTime: '', breakTime: 0 },
  sunday: { enabled: false, startTime: '', endTime: '', breakTime: 0 },
} as const;