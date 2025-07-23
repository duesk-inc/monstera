import { useCallback } from 'react';
import { format, addDays, isBefore } from 'date-fns';
import { WeeklyReport, DailyRecord, DefaultWorkTimeSettings as ApiDefaultWorkTimeSettings } from '@/types/weeklyReport';
import { getDayOfWeek } from '@/utils/dateUtils';
import { DEFAULT_WORK_TIME } from '@/constants/defaultWorkTime';

export interface UseWeeklyReportDefaultReturn {
  generateDailyRecordsFromDateRange: (
    startDate: Date, 
    endDate: Date, 
    defaultSettings: ApiDefaultWorkTimeSettings | null, 
    existingRecords?: DailyRecord[]
  ) => DailyRecord[];
  applyDefaultSettingsToReport: (
    report: WeeklyReport,
    defaultSettings: ApiDefaultWorkTimeSettings,
    isSubmitted: (status: string | undefined) => boolean,
    isDraft: (status: string | undefined) => boolean
  ) => WeeklyReport;
  forceApplyDefaultSettingsToReport: (
    report: WeeklyReport,
    defaultSettings: ApiDefaultWorkTimeSettings,
    isSubmitted: (status: string | undefined) => boolean,
    isDraft: (status: string | undefined) => boolean
  ) => WeeklyReport;
  isReportNew: (report: WeeklyReport) => boolean;
}

/**
 * 週報のデフォルト設定適用を担当するフック
 * 日次レコード生成、デフォルト設定適用等を提供
 */
export const useWeeklyReportDefault = (): UseWeeklyReportDefaultReturn => {
  // 週の日付配列から日次レコードを生成する関数
  const generateDailyRecordsFromDateRange = useCallback((
    startDate: Date, 
    endDate: Date, 
    defaultSettings: ApiDefaultWorkTimeSettings | null, 
    existingRecords: DailyRecord[] = []
  ): DailyRecord[] => {
    const newDailyRecords: DailyRecord[] = [];
    const days: Date[] = [];
    let currentDate = new Date(startDate);
    
    // 週の日付配列を生成
    while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
      days.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    // 日ごとのレコードを初期化
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const existingRecord = existingRecords.find(r => r.date === dateStr);
      
      if (existingRecord) {
        newDailyRecords.push(existingRecord);
      } else {
        // 曜日を取得し、対応するデフォルト設定があるか確認
        const dayOfWeek = getDayOfWeek(day);
        const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
        
        // デフォルト設定がない場合は初期値を使用
        if (!defaultSettings || isWeekend) {
          newDailyRecords.push({
            date: dateStr,
            startTime: isWeekend ? '' : DEFAULT_WORK_TIME.START_TIME,
            endTime: isWeekend ? '' : DEFAULT_WORK_TIME.END_TIME,
            breakTime: isWeekend ? 0 : DEFAULT_WORK_TIME.BREAK_TIME,
            remarks: '',
            isHolidayWork: false,
          });
          return;
        }
        
        // 平日の場合はデフォルト設定を使用
        newDailyRecords.push({
          date: dateStr,
          startTime: defaultSettings.weekdayStart,
          endTime: defaultSettings.weekdayEnd,
          breakTime: defaultSettings.weekdayBreak,
          remarks: '',
          isHolidayWork: false,
        });
      }
    });
    
    return newDailyRecords;
  }, []);

  // 現在表示中の週報にデフォルト設定を適用する関数
  const applyDefaultSettingsToReport = useCallback((
    report: WeeklyReport,
    defaultSettings: ApiDefaultWorkTimeSettings,
    isSubmitted: (status: string | undefined) => boolean,
    isDraft: (status: string | undefined) => boolean
  ): WeeklyReport => {
    // 提出済みまたは下書きの週報には適用しない
    if (isSubmitted(report.status) || isDraft(report.status)) {
      return report;
    }
    
    const updatedRecords = report.dailyRecords.map(record => {
      // 日付から曜日を取得
      const date = new Date(record.date);
      const dayOfWeek = getDayOfWeek(date);
      const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
      
      let updatedRecord = { ...record };
      
      // 週末の場合はスキップ（土日は設定しない）
      if (isWeekend) {
        return updatedRecord;
      }
      
      // 平日の場合、既存のデータがない場合のみデフォルト設定を適用
      // startTimeとendTimeが両方空の場合のみ適用
      if (!updatedRecord.startTime && !updatedRecord.endTime) {
        updatedRecord = {
          ...updatedRecord,
          startTime: defaultSettings.weekdayStart,
          endTime: defaultSettings.weekdayEnd,
          breakTime: defaultSettings.weekdayBreak
        };
      }
      
      // 客先勤怠がONで、客先勤怠の時間が未設定の場合のみ適用
      if (updatedRecord.hasClientWork && !updatedRecord.clientStartTime && !updatedRecord.clientEndTime) {
        updatedRecord = {
          ...updatedRecord,
          clientStartTime: updatedRecord.startTime || defaultSettings.weekdayStart,
          clientEndTime: updatedRecord.endTime || defaultSettings.weekdayEnd,
          clientBreakTime: updatedRecord.breakTime || defaultSettings.weekdayBreak
        };
      }
      
      return updatedRecord;
    });
    
    // 更新したレコードで週報を更新
    return {
      ...report,
      dailyRecords: updatedRecords
    };
  }, []);

  // 週報が新規（時間データが未入力）かどうかチェックする関数
  const isReportNew = useCallback((report: WeeklyReport): boolean => {
    // IDがない場合は新規
    if (!report.id) {
      return true;
    }
    
    // 全ての日次レコードが時間未入力の場合は新規とみなす
    const hasAnyTimeData = report.dailyRecords.some(record => {
      // 平日のレコードで時間データがあるかチェック
      const date = new Date(record.date);
      const dayOfWeek = getDayOfWeek(date);
      const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
      
      // 週末の場合は休日出勤でない限りスキップ
      if (isWeekend && !record.isHolidayWork) {
        return false;
      }
      
      // 時間データが入力されているかチェック
      return record.startTime !== '' || record.endTime !== '';
    });
    
    return !hasAnyTimeData;
  }, []);

  // 現在表示中の週報にデフォルト設定を強制適用する関数（保存ボタン押下時用）
  const forceApplyDefaultSettingsToReport = useCallback((
    report: WeeklyReport,
    defaultSettings: ApiDefaultWorkTimeSettings,
    isSubmitted: (status: string | undefined) => boolean,
    isDraft: (status: string | undefined) => boolean
  ): WeeklyReport => {
    // 提出済みまたは下書きの週報には適用しない
    if (isSubmitted(report.status) || isDraft(report.status)) {
      return report;
    }
    
    const updatedRecords = report.dailyRecords.map(record => {
      // 日付から曜日を取得
      const date = new Date(record.date);
      const dayOfWeek = getDayOfWeek(date);
      const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
      
      let updatedRecord = { ...record };
      
      // 週末の場合はスキップ（土日は設定しない）
      if (isWeekend) {
        return updatedRecord;
      }
      
      // 平日の場合、デフォルト設定を強制適用
      updatedRecord = {
        ...updatedRecord,
        startTime: defaultSettings.weekdayStart,
        endTime: defaultSettings.weekdayEnd,
        breakTime: defaultSettings.weekdayBreak
      };
      
      // 客先勤怠がONの場合、客先勤怠時間も更新
      if (updatedRecord.hasClientWork) {
        updatedRecord = {
          ...updatedRecord,
          clientStartTime: defaultSettings.weekdayStart,
          clientEndTime: defaultSettings.weekdayEnd,
          clientBreakTime: defaultSettings.weekdayBreak
        };
      }
      
      return updatedRecord;
    });
    
    // 更新したレコードで週報を更新
    return {
      ...report,
      dailyRecords: updatedRecords
    };
  }, []);

  return {
    generateDailyRecordsFromDateRange,
    applyDefaultSettingsToReport,
    forceApplyDefaultSettingsToReport,
    isReportNew,
  };
};