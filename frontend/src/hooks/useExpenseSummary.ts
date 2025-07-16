import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { expenseSummaryApi, type ExpenseSummaryParams, type ExpenseSummaryResponse } from '@/lib/api/expenseSummary';

/**
 * 経費申請集計を取得するカスタムフック
 */
export function useExpenseSummary(params: ExpenseSummaryParams = {}) {
  return useQuery({
    queryKey: ['expense', 'summary', params],
    queryFn: () => expenseSummaryApi.getSummary(params),
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分後にキャッシュをクリア
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 現在の月次・年次集計を取得するカスタムフック
 */
export function useCurrentExpenseSummary() {
  return useQuery({
    queryKey: ['expense', 'summary', 'current'],
    queryFn: () => expenseSummaryApi.getCurrentSummary(),
    staleTime: 2 * 60 * 1000, // 2分間はキャッシュを使用
    gcTime: 5 * 60 * 1000, // 5分後にキャッシュをクリア
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 年次集計を取得するカスタムフック
 */
export function useYearlyExpenseSummary(year?: number) {
  const currentYear = new Date().getFullYear();
  const targetYear = year || currentYear;

  return useQuery({
    queryKey: ['expense', 'summary', 'yearly', targetYear],
    queryFn: () => expenseSummaryApi.getYearlySummary(targetYear),
    enabled: !!targetYear,
    staleTime: 10 * 60 * 1000, // 10分間はキャッシュを使用
    gcTime: 30 * 60 * 1000, // 30分後にキャッシュをクリア
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 月次集計を取得するカスタムフック
 */
export function useMonthlyExpenseSummary(year?: number, month?: number) {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || (now.getMonth() + 1);

  return useQuery({
    queryKey: ['expense', 'summary', 'monthly', targetYear, targetMonth],
    queryFn: () => expenseSummaryApi.getMonthlySummary(targetYear, targetMonth),
    enabled: !!targetYear && !!targetMonth,
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 15 * 60 * 1000, // 15分後にキャッシュをクリア
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * 集計データの操作に関するユーティリティフック
 */
export function useExpenseSummaryUtils() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  }, []);

  const formatUsageRate = useCallback((usageRate: number): string => {
    return `${usageRate.toFixed(1)}%`;
  }, []);

  const getUsageColor = useCallback((usageRate: number): 'success' | 'warning' | 'error' => {
    if (usageRate >= 100) return 'error';
    if (usageRate >= 80) return 'warning';
    return 'success';
  }, []);

  const isOverLimit = useCallback((amount: number, limit: number): boolean => {
    return amount > limit;
  }, []);

  const isNearLimit = useCallback((amount: number, limit: number, threshold: number = 0.8): boolean => {
    return amount / limit >= threshold;
  }, []);

  const calculateProjectedAmount = useCallback((
    currentAmount: number,
    currentDay: number,
    daysInPeriod: number
  ): number => {
    if (currentDay === 0) return 0;
    return Math.round((currentAmount / currentDay) * daysInPeriod);
  }, []);

  const generateYearOptions = useCallback((startYear?: number, endYear?: number): Array<{ label: string; value: number }> => {
    const currentYear = new Date().getFullYear();
    const start = startYear || (currentYear - 5);
    const end = endYear || (currentYear + 1);
    
    const options = [];
    for (let year = end; year >= start; year--) {
      options.push({
        label: `${year}年`,
        value: year,
      });
    }
    return options;
  }, []);

  const generateMonthOptions = useCallback((): Array<{ label: string; value: number }> => {
    const options = [];
    for (let month = 1; month <= 12; month++) {
      options.push({
        label: `${month}月`,
        value: month,
      });
    }
    return options;
  }, []);

  const getBalanceStatus = useCallback((remaining: number, limit: number): { color: 'error' | 'warning' | 'info' | 'success'; status: string } => {
    const rate = (remaining / limit) * 100;
    if (rate <= 0) return { color: 'error', status: '超過' };
    if (rate <= 20) return { color: 'warning', status: '残りわずか' };
    if (rate <= 50) return { color: 'info', status: '半分以下' };
    return { color: 'success', status: '余裕あり' };
  }, []);

  return {
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    formatCurrency,
    formatUsageRate,
    getUsageColor,
    isOverLimit,
    isNearLimit,
    calculateProjectedAmount,
    generateYearOptions,
    generateMonthOptions,
    getBalanceStatus,
  };
}