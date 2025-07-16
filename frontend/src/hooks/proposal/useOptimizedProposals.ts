/**
 * パフォーマンス最適化された提案一覧フック
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProposals, type UseProposalsParams } from './useProposalQueries';
import { 
  ProposalPrefetchStrategy, 
  ProposalPerformanceMonitor,
  ProposalCacheOptimizer,
} from '../../utils/proposalPerformance';
import { debounce } from '../../utils/debounce';

interface UseOptimizedProposalsParams extends UseProposalsParams {
  enablePrefetch?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableAutoOptimization?: boolean;
}

/**
 * パフォーマンス最適化された提案一覧フック
 * 
 * 最適化機能:
 * - 次ページの自動プリフェッチ
 * - 表示中の提案詳細のプリフェッチ
 * - パフォーマンス監視
 * - 自動キャッシュ最適化
 * - デバウンスされたフィルター更新
 */
export const useOptimizedProposals = ({
  enablePrefetch = true,
  enablePerformanceMonitoring = process.env.NODE_ENV === 'development',
  enableAutoOptimization = true,
  ...params
}: UseOptimizedProposalsParams = {}) => {
  const queryClient = useQueryClient();
  
  // パフォーマンスツールのインスタンス
  const toolsRef = useRef({
    prefetchStrategy: new ProposalPrefetchStrategy(queryClient),
    performanceMonitor: new ProposalPerformanceMonitor(queryClient),
    cacheOptimizer: new ProposalCacheOptimizer(queryClient),
  });

  // 基本の提案フックを使用
  const proposalsResult = useProposals(params);
  const { 
    proposals, 
    page, 
    totalPages, 
    filters,
    setFilters: originalSetFilters,
    isLoading,
    isFetching,
  } = proposalsResult;

  // パフォーマンス測定開始時刻
  const fetchStartTimeRef = useRef<number>(0);

  // フェッチ開始時にタイマー開始
  useEffect(() => {
    if (isFetching && enablePerformanceMonitoring) {
      fetchStartTimeRef.current = Date.now();
    }
  }, [isFetching, enablePerformanceMonitoring]);

  // フェッチ完了時にパフォーマンス記録
  useEffect(() => {
    if (!isFetching && fetchStartTimeRef.current > 0 && enablePerformanceMonitoring) {
      const duration = Date.now() - fetchStartTimeRef.current;
      toolsRef.current.performanceMonitor.recordQueryPerformance(
        ['proposals', 'list', { ...filters, page }],
        duration
      );
      fetchStartTimeRef.current = 0;
    }
  }, [isFetching, filters, page, enablePerformanceMonitoring]);

  // 次ページのプリフェッチ
  useEffect(() => {
    if (enablePrefetch && !isLoading && proposals.length > 0 && page < totalPages) {
      toolsRef.current.prefetchStrategy.prefetchNextPage(
        page,
        totalPages,
        filters
      );
    }
  }, [enablePrefetch, isLoading, proposals, page, totalPages, filters]);

  // 表示中の提案詳細をプリフェッチ
  useEffect(() => {
    if (enablePrefetch && !isLoading && proposals.length > 0) {
      // 少し遅延させて優先度を下げる
      const timer = setTimeout(() => {
        toolsRef.current.prefetchStrategy.prefetchVisibleProposals(proposals);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [enablePrefetch, isLoading, proposals]);

  // 自動キャッシュ最適化
  useEffect(() => {
    if (enableAutoOptimization) {
      const interval = setInterval(() => {
        const optimized = toolsRef.current.cacheOptimizer.autoOptimizeIfNeeded();
        if (optimized && process.env.NODE_ENV === 'development') {
          console.log('Proposal cache auto-optimized due to high memory usage');
        }
      }, 60000); // 1分ごとにチェック

      return () => clearInterval(interval);
    }
  }, [enableAutoOptimization]);

  // デバウンスされたフィルター更新
  const debouncedSetFilters = useCallback(
    debounce((newFilters: Parameters<typeof originalSetFilters>[0]) => {
      originalSetFilters(newFilters);
    }, 300),
    [originalSetFilters]
  );

  // 手動でのキャッシュクリーンアップ
  const cleanupCache = useCallback(() => {
    toolsRef.current.cacheOptimizer.cleanupStaleCache();
  }, []);

  // パフォーマンスレポート生成
  const getPerformanceReport = useCallback(() => {
    if (enablePerformanceMonitoring) {
      return toolsRef.current.performanceMonitor.generateReport();
    }
    return null;
  }, [enablePerformanceMonitoring]);

  // 特定の提案詳細をプリフェッチ
  const prefetchProposalDetail = useCallback((proposalId: string) => {
    if (enablePrefetch) {
      queryClient.prefetchQuery({
        queryKey: ['proposals', 'detail', proposalId],
        queryFn: () => import('../../api/proposal').then(m => m.getProposalDetail(proposalId)),
      });
    }
  }, [queryClient, enablePrefetch]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      // コンポーネントアンマウント時にパフォーマンスデータをクリア
      if (enablePerformanceMonitoring) {
        toolsRef.current.performanceMonitor.clearPerformanceData();
      }
    };
  }, [enablePerformanceMonitoring]);

  return {
    ...proposalsResult,
    // オリジナルのsetFiltersの代わりにデバウンス版を提供
    setFilters: debouncedSetFilters,
    // 追加の最適化機能
    cleanupCache,
    getPerformanceReport,
    prefetchProposalDetail,
    // パフォーマンス情報
    performanceInfo: {
      cacheSize: enablePerformanceMonitoring 
        ? toolsRef.current.performanceMonitor.estimateCacheMemoryUsage()
        : null,
    },
  };
};

// デバウンスユーティリティ（既存のものがない場合）
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}