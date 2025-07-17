import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import { queryRetryConfig } from '@/lib/api/retry-config';
import { REACT_QUERY_CONFIG } from '@/constants/cache';

// React Query クライアント設定（最適化されたキャッシュ設定）
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // デフォルトのキャッシュ設定（短期キャッシュ）
      staleTime: REACT_QUERY_CONFIG.QUERY_SETTINGS.REPORT_DATA.staleTime, // 30分
      gcTime: REACT_QUERY_CONFIG.QUERY_SETTINGS.REPORT_DATA.cacheTime, // 2時間
      ...queryRetryConfig,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // 再接続時に自動で最新データを取得
      refetchInterval: false, // デフォルトでは自動更新しない（個別に設定）
      
      // エラー時の挙動
      throwOnError: false, // エラーはコンポーネント側で適切にハンドリング
      
      // ネットワーク状態に応じた制御
      networkMode: 'online', // オフライン時はクエリを実行しない
    },
    mutations: {
      retry: false,
      // ミューテーション成功時の動作
      onSuccess: () => {
        // 必要に応じて関連クエリを無効化
        // 個別のミューテーションで設定
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // クエリエラーのグローバルハンドリング
      console.error('Query error:', {
        error,
        queryKey: query.queryKey,
        queryHash: query.queryHash,
      });
      
      // 開発環境でのみ詳細ログ
      if (process.env.NODE_ENV === 'development') {
        console.group('Query Error Details');
        console.log('Query Key:', query.queryKey);
        console.log('Error:', error);
        console.log('Query State:', query.state);
        console.groupEnd();
      }
    },
    onSuccess: (data, query) => {
      // 開発環境でのパフォーマンス監視
      if (process.env.NODE_ENV === 'development') {
        const fetchTime = Date.now() - (query.state.dataUpdatedAt || 0);
        if (fetchTime > 1000) {
          console.warn(`Slow query detected: ${query.queryKey.join('.')} took ${fetchTime}ms`);
        }
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      // ミューテーションエラーのグローバルハンドリング
      console.error('Mutation error:', {
        error,
        variables,
        mutationKey: mutation.options.mutationKey,
      });
    },
    onSuccess: (data, variables, context, mutation) => {
      // 開発環境でのパフォーマンス監視
      if (process.env.NODE_ENV === 'development') {
        console.log('Mutation success:', {
          mutationKey: mutation.options.mutationKey,
          variables,
        });
      }
    },
  }),
});

// キャッシュユーティリティ関数
export const cacheUtils = {
  // 特定のクエリキーのキャッシュを無効化
  invalidateQueries: (queryKey: string[]) => {
    return queryClient.invalidateQueries({ queryKey });
  },
  
  // 特定のクエリキーのキャッシュを削除
  removeQueries: (queryKey: string[]) => {
    return queryClient.removeQueries({ queryKey });
  },
  
  // 全てのクエリのキャッシュを無効化（ログアウト時など）
  invalidateAll: () => {
    return queryClient.invalidateQueries();
  },
  
  // 全てのクエリのキャッシュをクリア
  clearAll: () => {
    return queryClient.clear();
  },
  
  // プリフェッチ（事前にデータを取得してキャッシュ）
  prefetchQuery: <TData>(
    queryKey: string[],
    queryFn: () => Promise<TData>,
    options?: { staleTime?: number; gcTime?: number }
  ) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: options?.staleTime,
      gcTime: options?.gcTime,
    });
  },
  
  // キャッシュサイズの監視（開発用）
  getCacheSize: () => {
    if (process.env.NODE_ENV === 'development') {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      return {
        totalQueries: queries.length,
        activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
        stalQueries: queries.filter(q => q.isStale()).length,
        memoryUsage: JSON.stringify(queries).length, // 概算のメモリ使用量
      };
    }
    return null;
  },
};