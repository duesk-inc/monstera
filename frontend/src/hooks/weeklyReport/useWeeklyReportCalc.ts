import { useCallback } from 'react';
import { WeeklyReport } from '@/types/weeklyReport';
import { calculateWorkHours } from '@/utils/dateUtils';

export interface UseWeeklyReportCalcReturn {
  calculateTotalHours: (report: WeeklyReport) => { companyTotal: number, clientTotal: number };
  getTotalHours: (report: WeeklyReport) => number;
  getClientTotalHours: (report: WeeklyReport) => number;
}

/**
 * 週報の計算処理を担当するフック
 * 勤務時間の計算、合計時間の算出などを提供
 */
export const useWeeklyReportCalc = (): UseWeeklyReportCalcReturn => {
  // 自社と客先の合計稼働時間の計算
  const calculateTotalHours = useCallback((report: WeeklyReport): { companyTotal: number, clientTotal: number } => {
    let companyTotal = 0;
    let clientTotal = 0;
    
    report.dailyRecords.forEach(record => {
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
  }, []);

  // 自社勤怠の合計時間を取得
  const getTotalHours = useCallback((report: WeeklyReport): number => {
    const { companyTotal } = calculateTotalHours(report);
    return companyTotal;
  }, [calculateTotalHours]);

  // 客先勤怠の合計時間を取得
  const getClientTotalHours = useCallback((report: WeeklyReport): number => {
    const { clientTotal } = calculateTotalHours(report);
    return clientTotal;
  }, [calculateTotalHours]);

  return {
    calculateTotalHours,
    getTotalHours,
    getClientTotalHours,
  };
};