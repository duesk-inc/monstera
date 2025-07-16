import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { getYearlySummary } from '@/lib/api/expense';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import type { YearlySummary, MonthlyBreakdown } from '@/types/expense';

// フック引数の型定義
export interface UseExpenseFiscalYearParams {
  year?: number;
  isFiscalYear?: boolean;
  autoFetch?: boolean;
}

// フック戻り値の型定義
export interface UseExpenseFiscalYearReturn {
  // データ
  summary: YearlySummary | undefined;
  monthlyBreakdown: MonthlyBreakdown[];
  
  // 状態
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  
  // アクション
  refetch: () => void;
  setYear: (year: number) => void;
  setIsFiscalYear: (isFiscalYear: boolean) => void;
  
  // ヘルパー関数
  getFiscalYearRange: () => { start: string; end: string };
  getCurrentFiscalYear: () => number;
  formatFiscalYearLabel: (year: number) => string;
  formatCalendarYearLabel: (year: number) => string;
  generateYearOptions: (count?: number) => Array<{ label: string; value: number; isFiscal: boolean }>;
}

/**
 * 現在の会計年度を取得する関数
 */
const getCurrentFiscalYear = (): number => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 0-based to 1-based
  
  // 4月以降は当年度、3月以前は前年度
  return currentMonth >= 4 ? currentYear : currentYear - 1;
};

/**
 * 指定された会計年度の期間を取得する関数
 */
const getFiscalYearRange = (fiscalYear: number): { start: string; end: string } => {
  const startYear = fiscalYear;
  const endYear = fiscalYear + 1;
  
  return {
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`,
  };
};

/**
 * 経費申請の会計年度集計を管理するカスタムフック
 */
export const useExpenseFiscalYear = ({
  year,
  isFiscalYear = false,
  autoFetch = true,
}: UseExpenseFiscalYearParams = {}): UseExpenseFiscalYearReturn => {
  
  const { handleSubmissionError } = useEnhancedErrorHandler();
  
  // 状態管理
  const [currentYear, setCurrentYear] = useState<number>(
    year || (isFiscalYear ? getCurrentFiscalYear() : new Date().getFullYear())
  );
  const [isFiscalYearState, setIsFiscalYearState] = useState<boolean>(isFiscalYear);

  // React Query設定
  const {
    data: summary,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['expense', 'yearly-summary', currentYear, isFiscalYearState],
    queryFn: ({ signal }) => getYearlySummary(currentYear, isFiscalYearState, signal),
    enabled: autoFetch && !!currentYear,
    staleTime: 10 * 60 * 1000, // 10分
    gcTime: 30 * 60 * 1000, // 30分
    retry: (failureCount, error) => {
      if (error && 'status' in error && typeof error.status === 'number') {
        return error.status >= 500 && failureCount < 3;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // 月次内訳データの取得
  const monthlyBreakdown = useMemo(() => {
    return summary?.monthlyBreakdown || [];
  }, [summary]);

  // 年度変更
  const setYear = useCallback((newYear: number) => {
    setCurrentYear(newYear);
  }, []);

  // 会計年度フラグ変更
  const setIsFiscalYear = useCallback((newIsFiscalYear: boolean) => {
    setIsFiscalYearState(newIsFiscalYear);
    // 会計年度フラグが変更された場合、年度も適切に調整
    if (newIsFiscalYear && !isFiscalYearState) {
      // カレンダー年度から会計年度に変更
      setCurrentYear(getCurrentFiscalYear());
    } else if (!newIsFiscalYear && isFiscalYearState) {
      // 会計年度からカレンダー年度に変更
      setCurrentYear(new Date().getFullYear());
    }
  }, [isFiscalYearState]);

  // 会計年度の期間を取得
  const getFiscalYearRangeCallback = useCallback(() => {
    if (isFiscalYearState) {
      return getFiscalYearRange(currentYear);
    } else {
      return {
        start: `${currentYear}-01-01`,
        end: `${currentYear}-12-31`,
      };
    }
  }, [currentYear, isFiscalYearState]);

  // 会計年度ラベルのフォーマット
  const formatFiscalYearLabel = useCallback((year: number) => {
    return `${year}年度（${year}/4～${year + 1}/3）`;
  }, []);

  // カレンダー年度ラベルのフォーマット
  const formatCalendarYearLabel = useCallback((year: number) => {
    return `${year}年（${year}/1～${year}/12）`;
  }, []);

  // 年度選択肢を生成
  const generateYearOptions = useCallback((count: number = 10) => {
    const currentCalendarYear = new Date().getFullYear();
    const currentFiscalYear = getCurrentFiscalYear();
    const options = [];

    // カレンダー年度オプション
    for (let i = 0; i < count; i++) {
      const year = currentCalendarYear - i;
      options.push({
        label: formatCalendarYearLabel(year),
        value: year,
        isFiscal: false,
      });
    }

    // 会計年度オプション
    for (let i = 0; i < count; i++) {
      const year = currentFiscalYear - i;
      options.push({
        label: formatFiscalYearLabel(year),
        value: year,
        isFiscal: true,
      });
    }

    return options.sort((a, b) => {
      // 年度降順、同じ年度の場合は会計年度を先に
      if (a.value !== b.value) {
        return b.value - a.value;
      }
      return a.isFiscal ? -1 : 1;
    });
  }, [formatCalendarYearLabel, formatFiscalYearLabel]);

  // エラーハンドリング
  if (isError && error) {
    handleSubmissionError(error, isFiscalYearState ? '会計年度集計' : '年次集計');
  }

  return {
    // データ
    summary,
    monthlyBreakdown,
    
    // 状態
    isLoading,
    isFetching,
    isError,
    error,
    
    // アクション
    refetch,
    setYear,
    setIsFiscalYear,
    
    // ヘルパー関数
    getFiscalYearRange: getFiscalYearRangeCallback,
    getCurrentFiscalYear,
    formatFiscalYearLabel,
    formatCalendarYearLabel,
    generateYearOptions,
  };
};

// ユーティリティ関数をエクスポート
export { getCurrentFiscalYear, getFiscalYearRange };