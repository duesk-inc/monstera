// 勤怠ステータスの定数定義
// データベースのENUM値と完全に一致させる
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',           // 出勤
  ABSENT: 'absent',             // 欠勤
  LATE: 'late',                 // 遅刻
  EARLY_LEAVE: 'early_leave',   // 早退
  PAID_LEAVE: 'paid_leave',     // 有給休暇
  UNPAID_LEAVE: 'unpaid_leave', // 無給休暇
  HOLIDAY: 'holiday',           // 祝日
} as const;

// 表示用ステータスラベル
export const ATTENDANCE_STATUS_LABEL = {
  [ATTENDANCE_STATUS.PRESENT]: '出勤',
  [ATTENDANCE_STATUS.ABSENT]: '欠勤',
  [ATTENDANCE_STATUS.LATE]: '遅刻',
  [ATTENDANCE_STATUS.EARLY_LEAVE]: '早退',
  [ATTENDANCE_STATUS.PAID_LEAVE]: '有給休暇',
  [ATTENDANCE_STATUS.UNPAID_LEAVE]: '無給休暇',
  [ATTENDANCE_STATUS.HOLIDAY]: '祝日',
} as const;

// ステータス型の定義
export type AttendanceStatusType = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];

// ステータスカラーマッピング（Material-UI Chipカラー）
export const ATTENDANCE_STATUS_COLOR = {
  [ATTENDANCE_STATUS.PRESENT]: 'success' as const,
  [ATTENDANCE_STATUS.ABSENT]: 'error' as const,
  [ATTENDANCE_STATUS.LATE]: 'warning' as const,
  [ATTENDANCE_STATUS.EARLY_LEAVE]: 'warning' as const,
  [ATTENDANCE_STATUS.PAID_LEAVE]: 'info' as const,
  [ATTENDANCE_STATUS.UNPAID_LEAVE]: 'default' as const,
  [ATTENDANCE_STATUS.HOLIDAY]: 'default' as const,
} as const;