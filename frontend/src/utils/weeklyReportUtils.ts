import { 
  DailyRecord, 
  DefaultWorkTimeSettings, 
  ErrorState, 
  ValidationResult, 
  SameWorkTimeCheckResult, 
  WeeklyReport 
} from '@/types/weeklyReport';
import { calculateWorkHours, getDayOfWeek } from './dateUtils';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';

/**
 * 曜日に対応するデフォルト設定を取得する
 */
export const getDaySettings = (
  dayOfWeek: string, 
  defaultSettings: DefaultWorkTimeSettings
) => {
  switch(dayOfWeek) {
    case '月': return defaultSettings.customDaySettings.monday;
    case '火': return defaultSettings.customDaySettings.tuesday;
    case '水': return defaultSettings.customDaySettings.wednesday;
    case '木': return defaultSettings.customDaySettings.thursday;
    case '金': return defaultSettings.customDaySettings.friday;
    case '土': return defaultSettings.customDaySettings.saturday;
    case '日': return defaultSettings.customDaySettings.sunday;
    default: return { enabled: false, startTime: '', endTime: '', breakTime: 0 };
  }
};

/**
 * 1日分の勤怠レコードにデフォルト設定を適用する
 */
export const applyDefaultSettingsToRecord = (
  record: DailyRecord,
  dayOfWeek: string,
  isWeekend: boolean,
  defaultSettings: DefaultWorkTimeSettings
): DailyRecord => {
  let updatedRecord = { ...record };
  
  // 週末の場合
  if (isWeekend) {
    // 休日出勤の場合のみデフォルト設定を適用
    if (record.isHolidayWork) {
      // 曜日に対応するカスタム設定を取得
      const daySettings = getDaySettings(dayOfWeek, defaultSettings);
      
      // カスタム設定が有効ならそれを使用、そうでなければ平日の共通設定を使用
      const useCustomSettings = daySettings.enabled;
      const startTime = useCustomSettings ? daySettings.startTime : defaultSettings.weekdayStart;
      const endTime = useCustomSettings ? daySettings.endTime : defaultSettings.weekdayEnd;
      const breakTime = useCustomSettings ? daySettings.breakTime : defaultSettings.weekdayBreak;
      
      // 自社勤怠に設定
      updatedRecord = {
        ...updatedRecord,
        startTime: startTime,
        endTime: endTime,
        breakTime: breakTime
      };
      
      // 客先勤怠がONの場合は客先勤怠にも同じ設定を適用
      if (updatedRecord.hasClientWork) {
        updatedRecord = {
          ...updatedRecord,
          clientStartTime: startTime,
          clientEndTime: endTime,
          clientBreakTime: breakTime
        };
      }
    }
  } else {
    // 平日の場合、対応する曜日のカスタム設定またはデフォルト設定を適用
    const daySettings = getDaySettings(dayOfWeek, defaultSettings);
    
    // カスタム設定が有効ならそれを使用、そうでなければ平日の共通設定を使用
    const useCustomSettings = daySettings.enabled;
    const startTime = useCustomSettings ? daySettings.startTime : defaultSettings.weekdayStart;
    const endTime = useCustomSettings ? daySettings.endTime : defaultSettings.weekdayEnd;
    const breakTime = useCustomSettings ? daySettings.breakTime : defaultSettings.weekdayBreak;
    
    // 自社勤怠に設定
    updatedRecord = {
      ...updatedRecord,
      startTime: startTime,
      endTime: endTime,
      breakTime: breakTime
    };
    
    // 客先勤怠がONの場合は客先勤怠にも同じ設定を適用
    if (updatedRecord.hasClientWork) {
      updatedRecord = {
        ...updatedRecord,
        clientStartTime: startTime,
        clientEndTime: endTime,
        clientBreakTime: breakTime
      };
    }
  }
  
  return updatedRecord;
};

/**
 * 週報全体にデフォルト設定を適用する
 */
export const applyDefaultSettingsToReport = (
  report: WeeklyReport,
  defaultSettings: DefaultWorkTimeSettings
): WeeklyReport => {
  // 提出済みまたは下書きの週報には適用しない
  if (report.status === WEEKLY_REPORT_STATUS.SUBMITTED || report.status === WEEKLY_REPORT_STATUS.DRAFT) {
    return report;
  }
  
  const updatedRecords = report.dailyRecords.map(record => {
    // 日付から曜日を取得
    const date = new Date(record.date);
    const dayOfWeek = getDayOfWeek(date);
    const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
    
    return applyDefaultSettingsToRecord(record, dayOfWeek, isWeekend, defaultSettings);
  });
  
  // 更新したレコードで週報を更新
  return {
    ...report,
    dailyRecords: updatedRecords
  };
};

/**
 * 自社勤怠と客先勤怠の時間が同じかチェックする
 */
export const checkSameWorkTimes = (dailyRecords: DailyRecord[]): SameWorkTimeCheckResult => {
  let hasSameTime = false;
  let message = '';
  
  // 客先勤怠ONで時間が同じ日が一つでもあるかチェック
  dailyRecords.forEach(record => {
    if (record.hasClientWork && record.clientStartTime && record.clientEndTime) {
      const isSameStartTime = record.startTime === record.clientStartTime;
      const isSameEndTime = record.endTime === record.clientEndTime;
      const isSameBreakTime = record.breakTime === (record.clientBreakTime || 0);
      
      if (isSameStartTime && isSameEndTime && isSameBreakTime) {
        hasSameTime = true;
        message = '自社勤怠と客先勤怠の時間が同じです。自社の勤務時間と客先の勤務時間が同じ場合は、自社勤怠のみご入力ください。';
      }
    }
  });
  
  return { hasSameTime, message };
};

/**
 * 週報の自社と客先の合計稼働時間を計算する
 */
export const calculateTotalHours = (dailyRecords: DailyRecord[]): { companyTotal: number, clientTotal: number } => {
  let companyTotal = 0;
  let clientTotal = 0;
  
  dailyRecords.forEach(record => {
    // 自社勤怠の時間を計算
    const companyHours = calculateWorkHours(record.startTime, record.endTime, record.breakTime);
    companyTotal += companyHours;
    
    // 客先勤怠の時間を計算
    if (record.hasClientWork && record.clientStartTime && record.clientEndTime) {
      // 客先勤怠が有効な場合は客先の時間を使用
      const clientHours = calculateWorkHours(record.clientStartTime, record.clientEndTime, record.clientBreakTime || 0);
      clientTotal += clientHours;
    } else {
      // 客先勤怠が無効な場合は自社勤怠の時間を使用
      clientTotal += companyHours;
    }
  });
  
  return { companyTotal, clientTotal };
};

/**
 * 週報のバリデーションを行う
 */
export const validateWeeklyReport = (report: WeeklyReport): ValidationResult => {
  const errors: ErrorState = {};
  
  // 週総括のバリデーション（任意、1000文字まで）
  if (report.weeklyRemarks && report.weeklyRemarks.length > 1000) {
    errors.weeklyRemarks = '週総括は1000文字以内で入力してください';
  }
  
  // 稼働時間のバリデーション（少なくとも1日は入力必須）
  const { companyTotal } = calculateTotalHours(report.dailyRecords);
  if (companyTotal <= 0) {
    errors.dailyRecords = '少なくとも1日分の稼働時間を入力してください';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * 提出済みかどうかを判定する
 */
export const isSubmitted = (status: string | undefined): boolean => status === WEEKLY_REPORT_STATUS.SUBMITTED;

/**
 * 下書きかどうかを判定する
 */
export const isDraft = (status: string | undefined): boolean => status === WEEKLY_REPORT_STATUS.DRAFT; 