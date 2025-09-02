// 共通: 週報ステータスの型（文字列リテラル）
export type WeeklyReportStatus =
  | 'not_submitted'
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'returned';

// 型ガード（必要な場合に使用）
export const isWeeklyReportStatus = (v: string): v is WeeklyReportStatus =>
  (
    v === 'not_submitted' ||
    v === 'draft' ||
    v === 'submitted' ||
    v === 'approved' ||
    v === 'rejected' ||
    v === 'returned'
  );

