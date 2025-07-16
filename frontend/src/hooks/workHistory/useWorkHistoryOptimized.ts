import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workHistoryApi } from '@/lib/api/workHistory';
import { WorkHistoryItem, WorkHistorySearchParams } from '@/types/workHistory';
import { debounce } from 'lodash';

interface UseWorkHistoryOptimizedProps {
  searchParams?: WorkHistorySearchParams;
  enableCaching?: boolean;
  cacheTime?: number;
  staleTime?: number;
  refetchInterval?: number | false;
  suspense?: boolean;
}

interface UseWorkHistoryOptimizedReturn {
  workHistories: WorkHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
  dataUpdatedAt: number;
  memoizedData: {
    sortedData: WorkHistoryItem[];
    filteredData: WorkHistoryItem[];
    groupedByIndustry: Map<string, WorkHistoryItem[]>;
    groupedByYear: Map<string, WorkHistoryItem[]>;
  };
  performanceMetrics: {
    renderCount: number;
    lastRenderTime: number;
    averageRenderTime: number;
  };
}

export const useWorkHistoryOptimized = ({
  searchParams = {},
  enableCaching = true,
  cacheTime = 10 * 60 * 1000, // 10分
  staleTime = 5 * 60 * 1000, // 5分
  refetchInterval = false,
  suspense = false,
}: UseWorkHistoryOptimizedProps): UseWorkHistoryOptimizedReturn => {
  // パフォーマンス計測用
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderTimeRef = useRef(Date.now());

  // キャッシュキーの生成
  const queryKey = useMemo(
    () => ['workHistories', 'optimized', searchParams],
    [searchParams]
  );

  // デバウンスされた検索パラメータ
  const [debouncedSearchParams, setDebouncedSearchParams] = useState(searchParams);

  // 検索パラメータのデバウンス処理
  const debouncedSetSearchParams = useCallback(
    debounce((params: WorkHistorySearchParams) => {
      setDebouncedSearchParams(params);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetSearchParams(searchParams);
  }, [searchParams, debouncedSetSearchParams]);

  // データ取得
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey,
    queryFn: () => workHistoryApi.getWorkHistory(debouncedSearchParams),
    enabled: enableCaching,
    gcTime: cacheTime,
    staleTime,
    refetchInterval,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    suspense,
    // データの選択と変換を最適化
    select: useCallback((data: any) => {
      return {
        ...data,
        workHistories: data.workHistories || [],
      };
    }, []),
  });

  const workHistories = data?.workHistories || [];

  // メモ化されたデータ処理
  const memoizedData = useMemo(() => {
    // ソート済みデータ（日付降順）
    const sortedData = [...workHistories].sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return dateB - dateA;
    });

    // フィルタリング済みデータ（進行中のプロジェクトのみ）
    const filteredData = workHistories.filter((wh) => !wh.endDate);

    // 業界別グループ化
    const groupedByIndustry = new Map<string, WorkHistoryItem[]>();
    workHistories.forEach((wh) => {
      const industry = wh.industryName || String(wh.industry);
      if (!groupedByIndustry.has(industry)) {
        groupedByIndustry.set(industry, []);
      }
      groupedByIndustry.get(industry)!.push(wh);
    });

    // 年別グループ化
    const groupedByYear = new Map<string, WorkHistoryItem[]>();
    workHistories.forEach((wh) => {
      if (wh.startDate) {
        const year = new Date(wh.startDate).getFullYear().toString();
        if (!groupedByYear.has(year)) {
          groupedByYear.set(year, []);
        }
        groupedByYear.get(year)!.push(wh);
      }
    });

    return {
      sortedData,
      filteredData,
      groupedByIndustry,
      groupedByYear,
    };
  }, [workHistories]);

  // パフォーマンス計測
  useEffect(() => {
    const now = Date.now();
    const renderTime = now - lastRenderTimeRef.current;
    
    renderCountRef.current += 1;
    renderTimesRef.current.push(renderTime);
    
    // 最新100件のみ保持
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current.shift();
    }
    
    lastRenderTimeRef.current = now;
  });

  const performanceMetrics = useMemo(() => {
    const renderTimes = renderTimesRef.current;
    const averageRenderTime = renderTimes.length > 0
      ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
      : 0;

    return {
      renderCount: renderCountRef.current,
      lastRenderTime: renderTimesRef.current[renderTimesRef.current.length - 1] || 0,
      averageRenderTime,
    };
  }, []);

  return {
    workHistories,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    isFetching,
    dataUpdatedAt,
    memoizedData,
    performanceMetrics,
  };
};