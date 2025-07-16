import { format, isBefore, startOfMonth, endOfMonth } from 'date-fns';

// 日付から曜日を取得する関数
export const getDayOfWeek = (date: Date): string => {
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
  return dayOfWeek[date.getDay()];
};

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

// 現在の週を取得する関数
export const getCurrentWeek = (): { startDate: Date; endDate: Date } => {
  const today = new Date();
  // 週の開始日（月曜日）
  const startDate = new Date(today);
  const day = today.getDay();
  // getDay()は0が日曜、1が月曜、...なので、調整
  startDate.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  // 週の終了日（日曜日）
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return { startDate, endDate };
};

// 日本の年度を計算する関数（4月1日開始）
export const getFiscalYear = (date: Date): number => {
  const year = date.getFullYear();
  // 1月〜3月は前年度として扱う
  return date.getMonth() < 3 ? year - 1 : year;
};

// 当月と前月の週を生成する関数
export const generateCurrentAndPreviousMonthWeeks = (): { startDate: Date; endDate: Date }[] => {
  const weeks: { startDate: Date; endDate: Date }[] = [];
  const today = new Date();

  // 当月の初日と末日
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);

  // 前月の初日と末日
  const previousMonth = new Date(today);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const previousMonthStart = startOfMonth(previousMonth);
  const previousMonthEnd = endOfMonth(previousMonth);
  
  // 前月の最初の月曜日を取得
  const firstMondayPreviousMonth = new Date(previousMonthStart);
  const dayOfWeekPrevMonth = firstMondayPreviousMonth.getDay();
  if (dayOfWeekPrevMonth !== 1) { // 1は月曜日
    firstMondayPreviousMonth.setDate(
      firstMondayPreviousMonth.getDate() + (dayOfWeekPrevMonth === 0 ? 1 : 8 - dayOfWeekPrevMonth)
    );
  }
  
  // 当月の最初の月曜日を取得
  const firstMondayCurrentMonth = new Date(currentMonthStart);
  const dayOfWeekCurrMonth = firstMondayCurrentMonth.getDay();
  if (dayOfWeekCurrMonth !== 1) { // 1は月曜日
    firstMondayCurrentMonth.setDate(
      firstMondayCurrentMonth.getDate() + (dayOfWeekCurrMonth === 0 ? 1 : 8 - dayOfWeekCurrMonth)
    );
  }
  
  // 前月の週を生成
  let currentDate = new Date(firstMondayPreviousMonth);
  while (isBefore(currentDate, previousMonthEnd) || currentDate.getTime() === previousMonthEnd.getTime()) {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + 6); 
    
    if ((isBefore(startDate, previousMonthEnd) || startDate.getTime() === previousMonthEnd.getTime()) || (isBefore(previousMonthStart, endDate) || previousMonthStart.getTime() === endDate.getTime())) {
      weeks.push({ startDate, endDate });
    }
    
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  // 当月の週を生成
  currentDate = new Date(firstMondayCurrentMonth);
  while (isBefore(currentDate, currentMonthEnd) || currentDate.getTime() === currentMonthEnd.getTime()) {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + 6);
    
    if ((isBefore(startDate, currentMonthEnd) || startDate.getTime() === currentMonthEnd.getTime()) || (isBefore(currentMonthStart, endDate) || currentMonthStart.getTime() === endDate.getTime())) {
      // 重複しないようにチェック
      if (!weeks.some(week => 
        format(week.startDate, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd') &&
        format(week.endDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')
      )) {
        weeks.push({ startDate, endDate });
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  weeks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  return weeks;
};

// formatDateTime - 時間を含む日付を整形する
export const formatDateTime = (date: Date | string): string => {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

// formatDate - 日付のみを整形する
export const formatDate = (date: Date | string, formatStr: string = 'yyyy-MM-dd'): string => {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, formatStr);
}

// 日付の範囲を文字列に変換
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  return `${format(startDate, 'yyyy年MM月dd日')} 〜 ${format(endDate, 'yyyy年MM月dd日')}`;
}

// 日付の範囲をvalue文字列に変換（セパレータ付き）
export const dateRangeToValueString = (startDate: Date, endDate: Date): string => {
  return `${format(startDate, 'yyyy-MM-dd')}|${format(endDate, 'yyyy-MM-dd')}`;
}

// value文字列から日付の範囲を取得
export const parseValueStringToDateRange = (value: string): { startDate: Date, endDate: Date } | null => {
  const [startStr, endStr] = value.split('|');
  if (startStr && endStr) {
    return {
      startDate: new Date(startStr),
      endDate: new Date(endStr)
    };
  }
  return null;
}

// 前週を取得する関数
export const getPreviousWeek = (currentStartDate: Date): { startDate: Date; endDate: Date } => {
  // 現在の週の開始日から7日前が前週の開始日
  const startDate = new Date(currentStartDate);
  startDate.setDate(startDate.getDate() - 7);
  
  // 前週の終了日は前週の開始日から6日後
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return { startDate, endDate };
};

// 次週を取得する関数
export const getNextWeek = (currentStartDate: Date): { startDate: Date; endDate: Date } => {
  // 現在の週の開始日から7日後が次週の開始日
  const startDate = new Date(currentStartDate);
  startDate.setDate(startDate.getDate() + 7);
  
  // 次週の終了日は次週の開始日から6日後
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return { startDate, endDate };
};

// 安全に日付をフォーマットする関数
export const safeFormatDate = (dateValue: string | Date | null | undefined, formatStr: string = 'yyyy/MM/dd'): string => {
  try {
    if (!dateValue) return '不明';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // 無効な日付オブジェクトの場合
    if (isNaN(date.getTime())) return '不明';
    
    return format(date, formatStr);
  } catch (error) {
    console.error('日付のフォーマットに失敗しました:', error);
    return '不明';
  }
};

// 年月を比較する関数（年と月のみ比較）
export const compareYearMonth = (date1: Date | null, date2: Date | null): number => {
  if (!date1 || !date2) return 0;
  
  const year1 = date1.getFullYear();
  const month1 = date1.getMonth();
  const year2 = date2.getFullYear();
  const month2 = date2.getMonth();
  
  if (year1 !== year2) {
    return year1 - year2;
  }
  return month1 - month2;
}; 