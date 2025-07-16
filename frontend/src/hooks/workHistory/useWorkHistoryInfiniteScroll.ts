import { useState, useCallback, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { workHistoryApi } from '@/lib/api/workHistory';
import { WorkHistoryItem, WorkHistorySearchParams } from '@/types/workHistory';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface UseWorkHistoryInfiniteScrollProps {
  searchParams?: WorkHistorySearchParams;
  itemsPerPage?: number;
  enabled?: boolean;
}

interface UseWorkHistoryInfiniteScrollReturn {
  workHistories: WorkHistoryItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  totalCount: number;
  loadMoreRef: (node: HTMLElement | null) => void;
  refetch: () => void;
}

export const useWorkHistoryInfiniteScroll = ({
  searchParams = {},
  itemsPerPage = 20,
  enabled = true,
}: UseWorkHistoryInfiniteScrollProps): UseWorkHistoryInfiniteScrollReturn => {
  const loadMoreRef = useRef<HTMLElement | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['workHistories', 'infinite', searchParams],
    queryFn: async ({ pageParam = 1 }: { pageParam?: number }) => {
      const response = await workHistoryApi.getWorkHistory({
        ...searchParams,
        page: pageParam,
        limit: itemsPerPage,
      });

      // 総数を保存
      if (response.summary?.totalProjectCount) {
        setTotalCount(response.summary.totalProjectCount);
      }

      return {
        workHistories: response.workHistories || [],
        nextPage: response.workHistories?.length === itemsPerPage ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage: { workHistories: WorkHistoryItem[], nextPage?: number }) => lastPage.nextPage,
    initialPageParam: 1,
    enabled,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
    refetchOnWindowFocus: false,
  });

  // 全ページのデータを結合
  const workHistories = data?.pages.flatMap((page) => page.workHistories) || [];

  // 交差オブザーバーを使用した自動読み込み
  const { isIntersecting } = useIntersectionObserver({
    target: loadMoreRef,
    onIntersect: fetchNextPage,
    enabled: hasNextPage && !isFetchingNextPage,
    threshold: 0.1,
    rootMargin: '100px',
  });

  // loadMoreRef のコールバック
  const setLoadMoreRef = useCallback((node: HTMLElement | null) => {
    loadMoreRef.current = node;
  }, []);

  // デバッグ情報
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      console.log('Fetching next page due to intersection');
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage]);

  return {
    workHistories,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    isError,
    error: error as Error | null,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    isFetchingNextPage,
    totalCount,
    loadMoreRef: setLoadMoreRef,
    refetch,
  };
};