/**
 * 提案機能のパフォーマンス最適化ユーティリティ
 */

import { QueryClient } from '@tanstack/react-query';
import { PROPOSAL_QUERY_KEYS } from '../hooks/proposal/useProposalQueries';
import * as proposalApi from '../api/proposal';
import { CACHE_STRATEGIES } from '../constants/cache';
import type { GetProposalsRequest, ProposalItemDTO } from '../types/proposal';

/**
 * パフォーマンス監視設定
 */
const PERFORMANCE_CONFIG = {
  SLOW_QUERY_THRESHOLD: 1000, // 1秒以上をスローとみなす
  CACHE_SIZE_WARNING: 50, // 50個以上のクエリでワーニング
  MEMORY_WARNING_MB: 10, // 10MB以上でメモリワーニング
  PREFETCH_DELAY: 100, // プリフェッチの遅延時間（ms）
};

/**
 * 提案データのプリフェッチング戦略
 */
export class ProposalPrefetchStrategy {
  constructor(private queryClient: QueryClient) {}

  /**
   * 提案一覧の次ページをプリフェッチ
   */
  async prefetchNextPage(
    currentPage: number,
    totalPages: number,
    baseParams: Omit<GetProposalsRequest, 'page'>
  ): Promise<void> {
    if (currentPage >= totalPages) return;

    const nextPage = currentPage + 1;
    const queryKey = PROPOSAL_QUERY_KEYS.list({ ...baseParams, page: nextPage });

    // 既にキャッシュがある場合はスキップ
    const existingData = this.queryClient.getQueryData(queryKey);
    if (existingData) return;

    // 遅延実行でプリフェッチ
    setTimeout(() => {
      this.queryClient.prefetchQuery({
        queryKey,
        queryFn: () => proposalApi.getProposals({ ...baseParams, page: nextPage }),
        staleTime: CACHE_STRATEGIES.PROPOSALS_LIST.staleTime,
        gcTime: CACHE_STRATEGIES.PROPOSALS_LIST.gcTime,
      });
    }, PERFORMANCE_CONFIG.PREFETCH_DELAY);
  }

  /**
   * 表示されている提案の詳細をプリフェッチ
   */
  async prefetchVisibleProposals(proposals: ProposalItemDTO[]): Promise<void> {
    // 最初の3件のみプリフェッチ（パフォーマンスを考慮）
    const proposalsToPrefetch = proposals.slice(0, 3);

    proposalsToPrefetch.forEach((proposal, index) => {
      const queryKey = PROPOSAL_QUERY_KEYS.detail(proposal.id);
      const existingData = this.queryClient.getQueryData(queryKey);

      if (!existingData) {
        // 段階的にプリフェッチ
        setTimeout(() => {
          this.queryClient.prefetchQuery({
            queryKey,
            queryFn: () => proposalApi.getProposalDetail(proposal.id),
            staleTime: CACHE_STRATEGIES.PROPOSAL_DETAIL.staleTime,
            gcTime: CACHE_STRATEGIES.PROPOSAL_DETAIL.gcTime,
          });
        }, PERFORMANCE_CONFIG.PREFETCH_DELAY * (index + 1));
      }
    });
  }

  /**
   * 提案に関連する質問データをプリフェッチ
   */
  async prefetchProposalQuestions(proposalId: string): Promise<void> {
    const queryKey = PROPOSAL_QUERY_KEYS.questionsList(proposalId, {});

    this.queryClient.prefetchQuery({
      queryKey,
      queryFn: () => proposalApi.getQuestions(proposalId, {}),
      staleTime: CACHE_STRATEGIES.PROPOSAL_QUESTIONS.staleTime,
      gcTime: CACHE_STRATEGIES.PROPOSAL_QUESTIONS.gcTime,
    });
  }
}

/**
 * パフォーマンス監視クラス
 */
export class ProposalPerformanceMonitor {
  private performanceData: Map<string, PerformanceEntry> = new Map();

  constructor(private queryClient: QueryClient) {}

  /**
   * クエリパフォーマンスを記録
   */
  recordQueryPerformance(queryKey: unknown[], duration: number): void {
    const key = JSON.stringify(queryKey);
    const entry: PerformanceEntry = {
      queryKey: key,
      duration,
      timestamp: Date.now(),
      count: 1,
    };

    const existing = this.performanceData.get(key);
    if (existing) {
      entry.count = existing.count + 1;
      entry.averageDuration = (existing.averageDuration || existing.duration + duration) / entry.count;
    }

    this.performanceData.set(key, entry);

    // スロークエリの警告
    if (duration > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
      console.warn('Slow proposal query detected:', {
        queryKey,
        duration: `${duration}ms`,
      });
    }
  }

  /**
   * キャッシュメモリ使用量を推定
   */
  estimateCacheMemoryUsage(): CacheMemoryInfo {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    let totalSize = 0;
    const proposalQueries = queries.filter(query => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === 'proposals';
    });

    proposalQueries.forEach(query => {
      if (query.state.data) {
        // データサイズを推定（JSON文字列化）
        const dataSize = JSON.stringify(query.state.data).length;
        totalSize += dataSize;
      }
    });

    const totalSizeMB = totalSize / (1024 * 1024);

    return {
      totalQueries: proposalQueries.length,
      activeQueries: proposalQueries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: proposalQueries.filter(q => q.isStale()).length,
      estimatedSizeMB: totalSizeMB,
      warning: totalSizeMB > PERFORMANCE_CONFIG.MEMORY_WARNING_MB || 
               proposalQueries.length > PERFORMANCE_CONFIG.CACHE_SIZE_WARNING,
    };
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(): PerformanceReport {
    const slowQueries = Array.from(this.performanceData.values())
      .filter(entry => entry.duration > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slow queries

    const memoryInfo = this.estimateCacheMemoryUsage();

    return {
      slowQueries,
      memoryInfo,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * パフォーマンスデータをクリア
   */
  clearPerformanceData(): void {
    this.performanceData.clear();
  }
}

/**
 * キャッシュ最適化ユーティリティ
 */
export class ProposalCacheOptimizer {
  constructor(private queryClient: QueryClient) {}

  /**
   * 古いキャッシュをクリーンアップ
   */
  cleanupStaleCache(): void {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    queries.forEach(query => {
      const key = query.queryKey;
      if (Array.isArray(key) && key[0] === 'proposals') {
        // アクティブなオブザーバーがなく、staleなクエリを削除
        if (query.getObserversCount() === 0 && query.isStale()) {
          this.queryClient.removeQueries({ queryKey: key });
        }
      }
    });
  }

  /**
   * 特定の条件でキャッシュを最適化
   */
  optimizeCache(options: CacheOptimizationOptions = {}): void {
    const { 
      removeInactive = true, 
      removeStale = true,
      keepRecent = 10,
    } = options;

    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // 提案関連のクエリを取得
    const proposalQueries = queries
      .filter(query => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === 'proposals';
      })
      .sort((a, b) => (b.state.dataUpdatedAt || 0) - (a.state.dataUpdatedAt || 0));

    // 最近のクエリ以外を処理
    proposalQueries.slice(keepRecent).forEach(query => {
      const shouldRemove = 
        (removeInactive && query.getObserversCount() === 0) ||
        (removeStale && query.isStale());

      if (shouldRemove) {
        this.queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  }

  /**
   * メモリ使用量が高い場合に自動最適化
   */
  autoOptimizeIfNeeded(): boolean {
    const memoryInfo = new ProposalPerformanceMonitor(this.queryClient).estimateCacheMemoryUsage();
    
    if (memoryInfo.warning) {
      this.optimizeCache({
        removeInactive: true,
        removeStale: true,
        keepRecent: 5,
      });
      return true;
    }
    
    return false;
  }
}

// 型定義
interface PerformanceEntry {
  queryKey: string;
  duration: number;
  timestamp: number;
  count: number;
  averageDuration?: number;
}

interface CacheMemoryInfo {
  totalQueries: number;
  activeQueries: number;
  staleQueries: number;
  estimatedSizeMB: number;
  warning: boolean;
}

interface PerformanceReport {
  slowQueries: PerformanceEntry[];
  memoryInfo: CacheMemoryInfo;
  timestamp: string;
}

interface CacheOptimizationOptions {
  removeInactive?: boolean;
  removeStale?: boolean;
  keepRecent?: number;
}

// デフォルトエクスポート
export const createProposalPerformanceTools = (queryClient: QueryClient) => ({
  prefetchStrategy: new ProposalPrefetchStrategy(queryClient),
  performanceMonitor: new ProposalPerformanceMonitor(queryClient),
  cacheOptimizer: new ProposalCacheOptimizer(queryClient),
});