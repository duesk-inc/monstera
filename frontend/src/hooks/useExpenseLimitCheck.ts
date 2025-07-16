import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { expenseLimitApi, type CheckLimitsParams, type LimitCheckResult } from '@/lib/api/expenseLimit';
import { useToast } from './useToast';

// デバウンス用のフック
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 経費申請の上限チェックを行うカスタムフック
 */
export function useExpenseLimitCheck(params: CheckLimitsParams | null) {
  const { showWarning } = useToast();

  return useQuery({
    queryKey: ['expense', 'limits', 'check', params],
    queryFn: () => {
      if (!params || params.amount <= 0) {
        throw new Error('Invalid parameters');
      }
      return expenseLimitApi.checkLimits(params);
    },
    enabled: !!params && params.amount > 0,
    staleTime: 2 * 60 * 1000, // 2分間はキャッシュを使用
    gcTime: 5 * 60 * 1000, // 5分後にキャッシュをクリア
    retry: (failureCount, error: any) => {
      // 400エラー（バリデーションエラー）の場合はリトライしない
      if (error?.response?.status === 400) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
}

/**
 * リアルタイム上限チェック用のカスタムフック（デバウンス付き）
 */
export function useRealtimeExpenseLimitCheck(
  amount: number,
  expenseDate?: string,
  enabled: boolean = true
) {
  const { showWarning } = useToast();
  
  // 入力値をデバウンス（500ms）
  const debouncedAmount = useDebounce(amount, 500);
  const debouncedExpenseDate = useDebounce(expenseDate, 500);

  const queryParams: CheckLimitsParams | null = 
    debouncedAmount > 0 && enabled
      ? {
          amount: debouncedAmount,
          expenseDate: debouncedExpenseDate,
        }
      : null;

  const query = useQuery({
    queryKey: ['expense', 'limits', 'realtime', queryParams],
    queryFn: () => {
      if (!queryParams) {
        throw new Error('Invalid parameters');
      }
      return expenseLimitApi.checkLimitsRealtime(queryParams);
    },
    enabled: !!queryParams && enabled,
    staleTime: 30 * 1000, // 30秒間はキャッシュを使用
    gcTime: 2 * 60 * 1000, // 2分後にキャッシュをクリア
    retry: false, // リアルタイムチェックはリトライしない
  });

  // 警告の表示処理
  useEffect(() => {
    if (query.data && !query.isLoading && !query.error) {
      const result = query.data;
      
      // 上限超過の警告
      if (!result.withinMonthlyLimit) {
        showWarning(`月次上限（${result.monthlyLimitAmount.toLocaleString()}円）を超過します`);
      } else if (!result.withinYearlyLimit) {
        showWarning(`年次上限（${result.yearlyLimitAmount.toLocaleString()}円）を超過します`);
      }
      // 上限接近の警告
      else if (result.isNearMonthlyLimit) {
        showWarning(`月次上限の${result.warningThreshold * 100}%に近づいています（残り${result.remainingMonthlyAmount.toLocaleString()}円）`);
      } else if (result.isNearYearlyLimit) {
        showWarning(`年次上限の${result.warningThreshold * 100}%に近づいています（残り${result.remainingYearlyAmount.toLocaleString()}円）`);
      }
    }
  }, [query.data, query.isLoading, query.error, showWarning]);

  return query;
}

/**
 * 上限チェック結果に基づく表示用ヘルパー
 */
export function useLimitCheckHelpers() {
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  }, []);

  const getLimitStatusMessage = useCallback((result: LimitCheckResult): string => {
    if (!result.withinMonthlyLimit) {
      return '月次上限を超過しています';
    }
    if (!result.withinYearlyLimit) {
      return '年次上限を超過しています';
    }
    if (result.isNearMonthlyLimit) {
      return `月次上限まで残り${formatCurrency(result.remainingMonthlyAmount)}`;
    }
    if (result.isNearYearlyLimit) {
      return `年次上限まで残り${formatCurrency(result.remainingYearlyAmount)}`;
    }
    return '上限内です';
  }, [formatCurrency]);

  const getLimitStatusColor = useCallback((result: LimitCheckResult): 'success' | 'warning' | 'error' => {
    if (!result.withinMonthlyLimit || !result.withinYearlyLimit) {
      return 'error';
    }
    if (result.isNearMonthlyLimit || result.isNearYearlyLimit) {
      return 'warning';
    }
    return 'success';
  }, []);

  const canSubmitExpense = useCallback((result: LimitCheckResult): boolean => {
    return result.withinMonthlyLimit && result.withinYearlyLimit;
  }, []);

  return {
    formatCurrency,
    getLimitStatusMessage,
    getLimitStatusColor,
    canSubmitExpense,
  };
}