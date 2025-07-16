// 統一チップコンポーネントからインポート
import { getStatusChipInfo, getLeaveTypeLabel as getUnifiedLeaveTypeLabel } from './chipUtils';

// 後方互換性のため、既存のインターフェースを維持
export { type StatusChipInfo } from './chipUtils';

// 統一ユーティリティ関数を使用
export const getStatusChip = getStatusChipInfo;
export const getLeaveTypeLabel = getUnifiedLeaveTypeLabel;

// 休暇タイプに応じて理由の入力が必要かどうかをチェックする関数
export const isReasonRequired = (leaveType: string): boolean => {
  // 特別休暇や慶弔休暇の場合は理由が必要
  return ['special', 'condolence'].includes(leaveType);
};

// 休暇日数を計算する関数
export const calculateLeaveDays = (
  selectedDates: Date[],
  isHourlyBased: boolean,
  startTime?: string,
  endTime?: string
): number => {
  if (!selectedDates || selectedDates.length === 0) return 0;
  
  if (isHourlyBased && startTime && endTime) {
    // 時間単位の場合、開始時刻と終了時刻から計算
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    
    const startHour = parseInt(startParts[0]) + parseInt(startParts[1]) / 60;
    const endHour = parseInt(endParts[0]) + parseInt(endParts[1]) / 60;
    
    // 終了時間が開始時間より前の場合は0を返す
    if (endHour <= startHour) return 0;
    
    // 昼休憩1時間を差し引く（例えば12-13時の間に昼休憩がある場合）
    let hours = endHour - startHour;
    
    // 昼休憩時間帯（12:00-13:00）と重複する場合、その分を差し引く
    const lunchBreakStart = 12;
    const lunchBreakEnd = 13;
    
    if (startHour < lunchBreakEnd && endHour > lunchBreakStart) {
      const overlapStart = Math.max(startHour, lunchBreakStart);
      const overlapEnd = Math.min(endHour, lunchBreakEnd);
      hours -= Math.max(0, overlapEnd - overlapStart);
    }
    
    // 時間を日数に変換（8時間 = 1日）× 選択された日数
    return Math.max(0, hours) / 8 * selectedDates.length;
  } else {
    // 日単位の場合、選択された日数を合計
    return selectedDates.length;
  }
};
