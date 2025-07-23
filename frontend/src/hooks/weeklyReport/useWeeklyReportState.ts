import { useState, useCallback } from 'react';
import { WeeklyReport } from '@/types/weeklyReport';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';
import { getCurrentWeek } from '@/utils/dateUtils';

export interface WeeklyReportErrors {
  weeklyRemarks?: string;
  dailyRecords?: string;
  fetch?: string;
}

export interface UseWeeklyReportStateReturn {
  report: WeeklyReport;
  setReport: React.Dispatch<React.SetStateAction<WeeklyReport>>;
  errors: WeeklyReportErrors;
  setErrors: React.Dispatch<React.SetStateAction<WeeklyReportErrors>>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  isSubmitted: (status: string | undefined) => boolean;
  isDraft: (status: string | undefined) => boolean;
}

/**
 * 週報の基本的な状態管理を担当するフック
 * 状態の初期化、取得、更新機能を提供
 */
export const useWeeklyReportState = (): UseWeeklyReportStateReturn => {
  // 初期値の設定
  const defaultWeek = getCurrentWeek();
  
  // 週報の状態
  const [report, setReport] = useState<WeeklyReport>({
    startDate: defaultWeek.startDate,
    endDate: defaultWeek.endDate,
    dailyRecords: [],
    weeklyRemarks: '',
    status: WEEKLY_REPORT_STATUS.NOT_SUBMITTED,
    totalWorkHours: 0,
    clientTotalWorkHours: 0,
    workplaceChangeRequested: false,
  });

  // 入力バリデーション
  const [errors, setErrors] = useState<WeeklyReportErrors>({});

  // ローディング状態
  const [loading, setLoading] = useState(false);

  // 提出済みかどうかを判定するヘルパー関数
  const isSubmitted = useCallback((status: string | undefined) => 
    status === WEEKLY_REPORT_STATUS.SUBMITTED, []);
  
  // 下書きかどうかを判定するヘルパー関数
  const isDraft = useCallback((status: string | undefined) => 
    status === WEEKLY_REPORT_STATUS.DRAFT, []);

  return {
    report,
    setReport,
    errors,
    setErrors,
    loading,
    setLoading,
    isSubmitted,
    isDraft,
  };
};