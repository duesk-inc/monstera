// 統一チップコンポーネント用の型定義
export type NotificationType = 'leave' | 'expense' | 'weekly' | 'project' | 'system';
export type ExpenseCategory = 'transport' | 'meal' | 'accommodation' | 'entertainment' | 'office_supplies' | 'book' | 'seminar' | 'other';
export type LeaveCategory = 'paid' | 'sick' | 'special' | 'condolence' | 'maternity' | 'childcare' | 'nursing';

// StatusChipで使用するステータス情報の型定義
export interface StatusChipInfo {
  color: 'success' | 'warning' | 'error' | 'default' | 'info';
  label: string;
}

/**
 * 申請ステータスに応じたChip情報を取得する統一関数
 * 既存のgetStatusChip関数を置き換える
 */
export const getStatusChipInfo = (status: string): StatusChipInfo => {
  switch (status) {
    case 'approved':
      return { color: 'success', label: '承認済' };
    case 'pending':
      return { color: 'warning', label: '申請中' };
    case 'rejected':
      return { color: 'error', label: '却下' };
    case 'submitted':
      return { color: 'success', label: '提出済' };
    case 'draft':
      return { color: 'warning', label: '下書き' };
    case 'not_submitted':
      return { color: 'default', label: '未提出' };
    default:
      return { color: 'default', label: '不明' };
  }
};

/**
 * 通知タイプの日本語名を取得する統一関数
 * 既存のgetNotificationTypeName関数を置き換える
 */
export const getNotificationTypeName = (type: NotificationType): string => {
  switch (type) {
    case 'leave':
      return '休暇';
    case 'expense':
      return '経費';
    case 'weekly':
      return '週報';
    case 'project':
      return 'プロジェクト';
    case 'system':
      return 'システム';
    default:
      return '不明';
  }
};

/**
 * 経費カテゴリの日本語名を取得する統一関数
 * 既存のgetCategoryLabel関数を置き換える
 */
export const getExpenseCategoryLabel = (categoryValue: string): string => {
  const categoryLabels: Record<ExpenseCategory, string> = {
    transport: '交通費',
    meal: '食費',
    accommodation: '宿泊費',
    entertainment: '接待費',
    office_supplies: '備品',
    book: '書籍',
    seminar: 'セミナー・研修',
    other: 'その他',
  };

  return categoryLabels[categoryValue as ExpenseCategory] || categoryValue;
};

/**
 * 休暇タイプの日本語名を取得する統一関数
 * 既存のgetLeaveTypeLabel関数を置き換える
 */
export const getLeaveTypeLabel = (leaveTypeId: string): string => {
  const leaveTypeLabels: Record<LeaveCategory, string> = {
    paid: '有給休暇',
    sick: '病気休暇',
    special: '特別休暇',
    condolence: '慶弔休暇',
    maternity: '産前産後休暇',
    childcare: '育児休暇',
    nursing: '介護休暇',
  };

  return leaveTypeLabels[leaveTypeId as LeaveCategory] || leaveTypeId;
};

/**
 * 週報ステータスのチップ情報を取得する関数
 */
export const getWeeklyReportStatusChipInfo = (status: string): StatusChipInfo => {
  switch (status) {
    case 'draft':
      return { color: 'warning', label: '下書き' };
    case 'submitted':
      return { color: 'success', label: '提出済' };
    case 'approved':
      return { color: 'success', label: '承認済' };
    case 'rejected':
      return { color: 'error', label: '却下' };
    default:
      return { color: 'default', label: '不明' };
  }
};

// 後方互換性のためのエイリアス関数（段階的移行用）
/**
 * @deprecated getStatusChipInfoを使用してください
 */
export const getStatusChip = getStatusChipInfo;

/**
 * @deprecated getExpenseCategoryLabelを使用してください
 */
export const getCategoryLabel = getExpenseCategoryLabel; 