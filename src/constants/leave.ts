// 休暇申請ステータス
export const LEAVE_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

// 休暇申請ステータスラベル
export const LEAVE_REQUEST_STATUS_LABELS: Record<string, string> = {
  [LEAVE_REQUEST_STATUS.PENDING]: '申請中',
  [LEAVE_REQUEST_STATUS.APPROVED]: '承認済み',
  [LEAVE_REQUEST_STATUS.REJECTED]: '却下',
  [LEAVE_REQUEST_STATUS.CANCELLED]: '取消',
};

// 休暇種別コード
export const LEAVE_TYPE_CODES = {
  PAID: 'paid',
  SUMMER: 'summer',
  CONDOLENCE: 'condolence',
  SPECIAL: 'special',
  SUBSTITUTE: 'substitute',
  MENSTRUAL: 'menstrual',
} as const;

// 休暇種別ラベル
export const LEAVE_TYPE_LABELS: Record<string, string> = {
  [LEAVE_TYPE_CODES.PAID]: '有給休暇',
  [LEAVE_TYPE_CODES.SUMMER]: '夏季休暇',
  [LEAVE_TYPE_CODES.CONDOLENCE]: '慶弔休暇',
  [LEAVE_TYPE_CODES.SPECIAL]: '特別休暇',
  [LEAVE_TYPE_CODES.SUBSTITUTE]: '振替特別休暇',
  [LEAVE_TYPE_CODES.MENSTRUAL]: '生理休暇',
};