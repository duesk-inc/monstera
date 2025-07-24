import { addMonths, setDate, endOfDay, isBefore, isAfter, differenceInDays, format } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * 経費申請の期限日を計算する
 * 経費発生月の翌月10日23:59:59が期限
 * 
 * @param expenseDate 経費発生日
 * @returns 申請期限日
 */
export function calculateExpenseDeadline(expenseDate: Date): Date {
  // 翌月の1日を取得
  const nextMonth = addMonths(expenseDate, 1);
  
  // 翌月10日の23:59:59を設定
  const deadline = endOfDay(setDate(nextMonth, 10));
  
  return deadline;
}

/**
 * 経費申請が期限内かどうかをチェック
 * 
 * @param expenseDate 経費発生日
 * @param currentDate 現在日時（省略時は現在時刻）
 * @returns 期限内ならtrue
 */
export function isWithinDeadline(expenseDate: Date, currentDate: Date = new Date()): boolean {
  const deadline = calculateExpenseDeadline(expenseDate);
  return isBefore(currentDate, deadline) || currentDate.getTime() === deadline.getTime();
}

/**
 * 期限まで、または期限切れからの日数を取得
 * 
 * @param expenseDate 経費発生日
 * @param currentDate 現在日時（省略時は現在時刻）
 * @returns 正の数: 期限までの残り日数、負の数: 期限切れからの経過日数
 */
export function getDaysUntilDeadline(expenseDate: Date, currentDate: Date = new Date()): number {
  const deadline = calculateExpenseDeadline(expenseDate);
  return differenceInDays(deadline, currentDate);
}

/**
 * 期限に関する警告レベルを判定
 * 
 * @param expenseDate 経費発生日
 * @param currentDate 現在日時（省略時は現在時刻）
 * @returns 'expired' | 'critical' | 'warning' | 'normal'
 */
export function getDeadlineWarningLevel(expenseDate: Date, currentDate: Date = new Date()): 'expired' | 'critical' | 'warning' | 'normal' {
  const daysUntilDeadline = getDaysUntilDeadline(expenseDate, currentDate);
  
  if (daysUntilDeadline < 0) {
    return 'expired'; // 期限切れ
  } else if (daysUntilDeadline <= 3) {
    return 'critical'; // 3日以内（緊急）
  } else if (daysUntilDeadline <= 7) {
    return 'warning'; // 7日以内（警告）
  } else {
    return 'normal'; // 通常
  }
}

/**
 * 期限日をフォーマットされた文字列で取得
 * 
 * @param expenseDate 経費発生日
 * @returns フォーマットされた期限日文字列
 */
export function getFormattedDeadline(expenseDate: Date): string {
  const deadline = calculateExpenseDeadline(expenseDate);
  return format(deadline, 'yyyy年MM月dd日', { locale: ja });
}

/**
 * 期限に関するメッセージを取得
 * 
 * @param expenseDate 経費発生日
 * @param currentDate 現在日時（省略時は現在時刻）
 * @returns 期限に関するユーザー向けメッセージ
 */
export function getDeadlineMessage(expenseDate: Date, currentDate: Date = new Date()): string {
  const daysUntilDeadline = getDaysUntilDeadline(expenseDate, currentDate);
  const formattedDeadline = getFormattedDeadline(expenseDate);
  
  if (daysUntilDeadline < 0) {
    return `申請期限（${formattedDeadline}）を${Math.abs(daysUntilDeadline)}日過ぎています`;
  } else if (daysUntilDeadline === 0) {
    return `本日（${formattedDeadline}）が申請期限です`;
  } else if (daysUntilDeadline <= 3) {
    return `申請期限（${formattedDeadline}）まであと${daysUntilDeadline}日です`;
  } else {
    return `申請期限: ${formattedDeadline}`;
  }
}

/**
 * 現在日付から申請可能な最も古い経費発生日を取得
 * （前月の1日）
 * 
 * @param currentDate 現在日時（省略時は現在時刻）
 * @returns 申請可能な最も古い経費発生日
 */
export function getEarliestAllowableExpenseDate(currentDate: Date = new Date()): Date {
  // 現在月の10日以前の場合は前月、11日以降の場合は当月の1日
  const currentDay = currentDate.getDate();
  
  if (currentDay <= 10) {
    // 前月の申請がまだ可能
    return setDate(addMonths(currentDate, -1), 1);
  } else {
    // 当月分のみ申請可能
    return setDate(currentDate, 1);
  }
}

/**
 * 1月の特別処理を考慮した期限チェック
 * 1月は前年12月分の申請も考慮
 * 
 * @param expenseDate 経費発生日
 * @param currentDate 現在日時（省略時は現在時刻）
 * @returns 申請可能ならtrue
 */
export function isAllowableForSubmission(expenseDate: Date, currentDate: Date = new Date()): boolean {
  const currentMonth = currentDate.getMonth(); // 0-11
  const currentYear = currentDate.getFullYear();
  const expenseYear = expenseDate.getFullYear();
  const expenseMonth = expenseDate.getMonth();
  
  // 基本的に現在年度のみ許可
  if (expenseYear !== currentYear) {
    // 1月の特例: 前年12月分は許可
    if (currentMonth === 0 && expenseYear === currentYear - 1 && expenseMonth === 11) {
      return isWithinDeadline(expenseDate, currentDate);
    }
    return false;
  }
  
  // 現在年度内でも期限チェック
  return isWithinDeadline(expenseDate, currentDate);
}