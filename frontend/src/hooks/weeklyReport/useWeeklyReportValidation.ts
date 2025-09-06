import { useCallback } from 'react';
import { WeeklyReport } from '@/types/weeklyReport';
import { WeeklyReportErrors } from './useWeeklyReportState';
import { useWeeklyReportCalc } from './useWeeklyReportCalc';
import { WEEKLY_REPORT_VALIDATION_MESSAGES } from '@/constants/validationMessages';

export interface UseWeeklyReportValidationReturn {
  validateForm: (report: WeeklyReport, setErrors: React.Dispatch<React.SetStateAction<WeeklyReportErrors>>) => boolean;
  checkSameWorkTimes: (report: WeeklyReport) => { hasSameTime: boolean, message: string };
}

/**
 * 週報のバリデーション処理を担当するフック
 * フォーム検証、勤務時間チェック等を提供
 */
export const useWeeklyReportValidation = (): UseWeeklyReportValidationReturn => {
  const { calculateTotalHours } = useWeeklyReportCalc();

  // バリデーションチェック
  const validateForm = useCallback((
    report: WeeklyReport, 
    setErrors: React.Dispatch<React.SetStateAction<WeeklyReportErrors>>
  ): boolean => {
    const newErrors: WeeklyReportErrors = {};
    
    // 週総括のバリデーション（任意、1000文字まで）
    if (report.weeklyRemarks && report.weeklyRemarks.length > 1000) {
      newErrors.weeklyRemarks = WEEKLY_REPORT_VALIDATION_MESSAGES.REFLECTION_TOO_LONG;
    }
    
    // 稼働時間のバリデーション（少なくとも1日は入力必須）
    const { companyTotal } = calculateTotalHours(report);
    if (companyTotal <= 0) {
      newErrors.dailyRecords = WEEKLY_REPORT_VALIDATION_MESSAGES.WORK_HOURS_REQUIRED;
    }
    
    setErrors(newErrors);
    
    // エラーがなければtrue、あればfalse
    return Object.keys(newErrors).length === 0;
  }, [calculateTotalHours]);

  // 自社勤怠と客先勤怠の時間が同じかチェック
  const checkSameWorkTimes = useCallback((report: WeeklyReport): { hasSameTime: boolean, message: string } => {
    let hasSameTime = false;
    let message = '';
    
    // 客先勤怠ONで時間が同じ日が一つでもあるかチェック
    report.dailyRecords.forEach(record => {
      if (record.hasClientWork && record.clientStartTime && record.clientEndTime) {
        const isSameStartTime = record.startTime === record.clientStartTime;
        const isSameEndTime = record.endTime === record.clientEndTime;
        const isSameBreakTime = record.breakTime === (record.clientBreakTime || 0);
        
        if (isSameStartTime && isSameEndTime && isSameBreakTime) {
          hasSameTime = true;
          message = WEEKLY_REPORT_VALIDATION_MESSAGES.WORK_CONTENT_REQUIRED;
        }
      }
    });
    
    return { hasSameTime, message };
  }, []);

  return {
    validateForm,
    checkSameWorkTimes,
  };
};
