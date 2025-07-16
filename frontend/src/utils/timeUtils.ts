import { format } from 'date-fns';

// 時間を時間と分に分割する関数
export const parseTimeString = (timeString: string): { hours: number, minutes: number } => {
  // 空文字列や無効な入力の場合は0を返す
  if (!timeString) return { hours: 0, minutes: 0 };
  
  // 数値のみの場合は時間として解釈（例：「1」→ 1時間、「1.5」→ 1時間30分）
  if (!timeString.includes(':')) {
    const numVal = parseFloat(timeString);
    if (!isNaN(numVal)) {
      const hours = Math.floor(numVal);
      const minutes = Math.round((numVal - hours) * 60);
      return { hours, minutes };
    }
    return { hours: 0, minutes: 0 };
  }
  
  // hh:mm形式の場合
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
};

// 時間を文字列に変換する関数
export const formatTimeString = (hours: number, minutes: number): string => {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// 稼働時間を計算する関数
export const calculateWorkHours = (startTime: string, endTime: string, breakTime: number): number => {
  if (!startTime || !endTime) return 0;
  
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);
  
  // 開始時間と終了時間から経過時間（分）を計算
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  const breakMinutes = breakTime * 60;
  
  // 終了時間が開始時間より前の場合は0を返す
  if (endMinutes <= startMinutes) return 0;
  
  // 総稼働時間（分）= 経過時間 - 休憩時間
  const workMinutes = endMinutes - startMinutes - breakMinutes;
  
  // 分を時間に変換（小数点第2位まで）
  return Math.max(0, parseFloat((workMinutes / 60).toFixed(2)));
};

// 時間をHH:MM:SS形式に整形
export const formatTimeWithSeconds = (timeStr: string): string => {
  if (!timeStr) return '';
  // すでにHH:MM:SS形式であれば変更しない
  if (timeStr.split(':').length === 3) return timeStr;
  // HH:MM形式の場合、秒を追加
  return `${timeStr}:00`;
};

// 時間フォーマット変換 - Date型からHH:MM形式の文字列を取得
export const formatTimeFromDate = (date: Date | null): string => {
  if (!date) return '';
  return format(date, 'HH:mm');
};

// 日付と時間からDateTime文字列を生成
export const createDateTimeString = (dateStr: string, timeStr: string): string => {
  if (!dateStr || !timeStr) return '';
  return `${dateStr}T${timeStr}:00`;
}; 