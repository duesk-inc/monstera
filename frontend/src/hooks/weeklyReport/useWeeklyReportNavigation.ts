import { useCallback } from 'react';
import { WeeklyReport } from '@/types/weeklyReport';
import { getCurrentWeek, getPreviousWeek, getNextWeek } from '@/utils/dateUtils';

export interface UseWeeklyReportNavigationReturn {
  handleSelectCurrentWeek: (
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    loadByDateRange: (startDate: Date, endDate: Date) => Promise<WeeklyReport | null>
  ) => Promise<void>;
  handleSelectPreviousWeek: (
    currentStartDate: Date,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    loadByDateRange: (startDate: Date, endDate: Date) => Promise<WeeklyReport | null>
  ) => Promise<void>;
  handleSelectNextWeek: (
    currentStartDate: Date,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    loadByDateRange: (startDate: Date, endDate: Date) => Promise<WeeklyReport | null>
  ) => Promise<void>;
  handleWeekSelect: (
    startStr: string,
    endStr: string,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    loadByDateRange: (startDate: Date, endDate: Date) => Promise<WeeklyReport | null>
  ) => Promise<void>;
}

/**
 * 週報の週選択ナビゲーションを担当するフック
 * 今週、前週、次週への移動処理等を提供
 */
export const useWeeklyReportNavigation = (): UseWeeklyReportNavigationReturn => {
  // 今週を選択するハンドラー
  const handleSelectCurrentWeek = useCallback(async (
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    loadByDateRange: (startDate: Date, endDate: Date) => Promise<WeeklyReport | null>
  ) => {
    const currentWeek = getCurrentWeek();
    await loadByDateRange(currentWeek.startDate, currentWeek.endDate);
  }, []);

  // 前週を選択するハンドラー
  const handleSelectPreviousWeek = useCallback(async (
    currentStartDate: Date,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    loadByDateRange: (startDate: Date, endDate: Date) => Promise<WeeklyReport | null>
  ) => {
    const previousWeek = getPreviousWeek(currentStartDate);
    await loadByDateRange(previousWeek.startDate, previousWeek.endDate);
  }, []);

  // 次週を選択するハンドラー
  const handleSelectNextWeek = useCallback(async (
    currentStartDate: Date,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    loadByDateRange: (startDate: Date, endDate: Date) => Promise<WeeklyReport | null>
  ) => {
    const nextWeek = getNextWeek(currentStartDate);
    await loadByDateRange(nextWeek.startDate, nextWeek.endDate);
  }, []);

  // 週選択ハンドラー
  const handleWeekSelect = useCallback(async (
    startStr: string,
    endStr: string,
    setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>,
    setLoading: (loading: boolean) => void,
    loadByDateRange: (startDate: Date, endDate: Date) => Promise<WeeklyReport | null>
  ) => {
    const newStartDate = new Date(startStr);
    const newEndDate = new Date(endStr);
    await loadByDateRange(newStartDate, newEndDate);
  }, []);

  return {
    handleSelectCurrentWeek,
    handleSelectPreviousWeek,
    handleSelectNextWeek,
    handleWeekSelect,
  };
};