// 週報ステータスの定数定義（ENUM型文字列ベース）
// データベースのENUM値と完全に一致させる
export const WEEKLY_REPORT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NOT_SUBMITTED: 'not_submitted', // UI用の状態
} as const;

// 後方互換性のためのレガシー定数（廃止予定）
export const LEGACY_WEEKLY_REPORT_STATUS = {
  NOT_SUBMITTED: 0,
  DRAFT: 1,
  SUBMITTED: 2,
} as const;

// 表示用ステータスラベル
export const WEEKLY_REPORT_STATUS_LABEL = {
  [WEEKLY_REPORT_STATUS.NOT_SUBMITTED]: '未提出',
  [WEEKLY_REPORT_STATUS.DRAFT]: '下書き',
  [WEEKLY_REPORT_STATUS.SUBMITTED]: '提出済',
  [WEEKLY_REPORT_STATUS.APPROVED]: '承認済',
  [WEEKLY_REPORT_STATUS.REJECTED]: '却下',
} as const;

// ステータス型の定義
export type WeeklyReportStatusType = typeof WEEKLY_REPORT_STATUS[keyof typeof WEEKLY_REPORT_STATUS];

// 後方互換性のための変換ユーティリティ（廃止予定）
export const convertLegacyIntStatusToString = (status: number): WeeklyReportStatusType => {
  switch (status) {
    case 0: return WEEKLY_REPORT_STATUS.NOT_SUBMITTED;  // NotSubmitted → not_submitted
    case 1: return WEEKLY_REPORT_STATUS.DRAFT;  // Draft → draft
    case 2: return WEEKLY_REPORT_STATUS.SUBMITTED;  // Submitted → submitted
    case 3: return WEEKLY_REPORT_STATUS.APPROVED;  // 管理者承認用
    case 4: return WEEKLY_REPORT_STATUS.REJECTED;  // 管理者却下用
    default: return WEEKLY_REPORT_STATUS.DRAFT;
  }
};

export const convertStringStatusToLegacyInt = (status: string): number => {
  switch (status) {
    case 'not_submitted': return 0;
    case 'draft': return 1;
    case 'submitted': return 2;
    case 'approved': return 3;
    case 'rejected': return 4;
    default: return 1;
  }
}; 