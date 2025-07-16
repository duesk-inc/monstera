import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { weeklyReportSummaryApi } from '@/lib/api/admin/weeklyReportSummary';
import { WeeklyReportSummaryResponse, PeriodFilter } from '@/types/admin/weeklyReportSummary';

// React Query のキー
export const weeklyReportSummaryKeys = {
  all: ['weeklyReportSummary'] as const,
  summary: (filters: PeriodFilter) => [...weeklyReportSummaryKeys.all, 'summary', filters] as const,
  monthly: (year: number, month: number, departmentId?: string) => 
    [...weeklyReportSummaryKeys.all, 'monthly', year, month, departmentId] as const,
  weekly: (weekStart: string, departmentId?: string) => 
    [...weeklyReportSummaryKeys.all, 'weekly', weekStart, departmentId] as const,
  quarterly: (year: number, quarter: number, departmentId?: string) => 
    [...weeklyReportSummaryKeys.all, 'quarterly', year, quarter, departmentId] as const,
};

/**
 * 週報サマリー統計取得のカスタムフック
 */
export const useWeeklyReportSummary = (
  filters: PeriodFilter,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
): UseQueryResult<WeeklyReportSummaryResponse, Error> & {
  refresh: () => void;
} => {
  const query = useQuery({
    queryKey: weeklyReportSummaryKeys.summary(filters),
    queryFn: () => weeklyReportSummaryApi.getSummary(filters),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 5 * 60 * 1000, // 5分間隔
    staleTime: 2 * 60 * 1000, // 2分間はキャッシュを使用
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    ...query,
    refresh: () => query.refetch(),
  };
};

/**
 * 月次統計取得のカスタムフック
 */
export const useMonthlyReportSummary = (
  year: number,
  month: number,
  departmentId?: string,
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<WeeklyReportSummaryResponse, Error> & {
  refresh: () => void;
} => {
  const query = useQuery({
    queryKey: weeklyReportSummaryKeys.monthly(year, month, departmentId),
    queryFn: () => weeklyReportSummaryApi.getMonthlySummary(year, month, departmentId),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    retry: 3,
  });

  return {
    ...query,
    refresh: () => query.refetch(),
  };
};

/**
 * ダッシュボード用の統計データ管理フック
 */
export const useDashboardStats = (departmentId?: string) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  
  // 現在の期間を計算
  const currentPeriod = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    
    // 今週の開始日（月曜日）を計算
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    switch (selectedPeriod) {
      case 'week':
        return {
          startDate: monday.toISOString().split('T')[0],
          endDate: new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };
      case 'month':
        return {
          startDate: new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth, 0).toISOString().split('T')[0],
        };
      case 'quarter':
        const quarterStartMonth = (currentQuarter - 1) * 3;
        return {
          startDate: new Date(currentYear, quarterStartMonth, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, quarterStartMonth + 3, 0).toISOString().split('T')[0],
        };
    }
  }, [selectedPeriod]);

  // サマリーデータを取得
  const { data, loading, error, refresh } = useWeeklyReportSummary(
    {
      ...currentPeriod,
      departmentId,
    },
    {
      refetchInterval: selectedPeriod === 'week' ? 2 * 60 * 1000 : 5 * 60 * 1000, // 週次は2分、月次・四半期は5分
    }
  );

  // 前期間のデータも取得してトレンド比較
  const previousPeriod = useMemo(() => {
    const { startDate, endDate } = currentPeriod;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = end.getTime() - start.getTime();
    
    const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - duration);
    
    return {
      startDate: prevStart.toISOString().split('T')[0],
      endDate: prevEnd.toISOString().split('T')[0],
    };
  }, [currentPeriod]);

  const { data: previousData } = useWeeklyReportSummary(
    {
      ...previousPeriod,
      departmentId,
    },
    {
      enabled: !!data, // 現在のデータが取得できた後に実行
    }
  );

  // 統計サマリーを計算
  const stats = useMemo(() => {
    if (!data?.summary) return null;
    
    const { summary } = data;
    const prevSummary = previousData?.summary;
    
    return {
      current: summary,
      previous: prevSummary,
      period: selectedPeriod,
      hasComparison: !!prevSummary,
    };
  }, [data, previousData, selectedPeriod]);

  return {
    stats,
    loading,
    error,
    refresh,
    selectedPeriod,
    setSelectedPeriod,
    currentPeriod,
  };
};