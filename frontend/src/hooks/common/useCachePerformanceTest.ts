import { useState, useCallback } from 'react';
import { useCachedAlertSettings } from '@/hooks/admin/useCachedAlertSettings';
import { useMonthlySummary } from '@/hooks/admin/useMonthlySummary';
import { useNotifications } from '@/hooks/common/useNotifications';
import { cacheUtils } from '@/lib/query-client';

interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  cacheHit: boolean;
  dataSize?: number;
}

/**
 * キャッシュパフォーマンステスト用フック（開発環境のみ）
 */
export const useCachePerformanceTest = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // 本番環境では何もしない
  if (process.env.NODE_ENV !== 'development') {
    return {
      metrics: [],
      isRunning: false,
      runPerformanceTest: () => {},
      clearMetrics: () => {},
      exportMetrics: () => {},
    };
  }

  const { alertSettings, refetch: refetchAlertSettings } = useCachedAlertSettings();
  const { notifications, refetch: refetchNotifications } = useNotifications();

  // パフォーマンステスト実行
  const runPerformanceTest = useCallback(async () => {
    setIsRunning(true);
    const newMetrics: PerformanceMetrics[] = [];

    try {
      // テスト1: アラート設定のキャッシュヒット vs キャッシュミス
      console.log('🧪 Cache Performance Test - Starting...');

      // キャッシュクリア → キャッシュミス測定
      cacheUtils.removeQueries(['alert-settings']);
      
      const test1Start = performance.now();
      await refetchAlertSettings();
      const test1End = performance.now();
      
      newMetrics.push({
        operation: 'Alert Settings (Cache Miss)',
        startTime: test1Start,
        endTime: test1End,
        duration: test1End - test1Start,
        cacheHit: false,
        dataSize: JSON.stringify(alertSettings).length,
      });

      // 即座に再取得 → キャッシュヒット測定
      const test2Start = performance.now();
      await refetchAlertSettings();
      const test2End = performance.now();
      
      newMetrics.push({
        operation: 'Alert Settings (Cache Hit)',
        startTime: test2Start,
        endTime: test2End,
        duration: test2End - test2Start,
        cacheHit: true,
        dataSize: JSON.stringify(alertSettings).length,
      });

      // テスト2: 通知のポーリング性能
      cacheUtils.removeQueries(['notifications']);
      
      const test3Start = performance.now();
      await refetchNotifications();
      const test3End = performance.now();
      
      newMetrics.push({
        operation: 'Notifications (Fresh)',
        startTime: test3Start,
        endTime: test3End,
        duration: test3End - test3Start,
        cacheHit: false,
        dataSize: JSON.stringify(notifications).length,
      });

      // テスト3: 複数クエリの並列実行
      const test4Start = performance.now();
      
      await Promise.all([
        refetchAlertSettings(),
        refetchNotifications(),
      ]);
      
      const test4End = performance.now();
      
      newMetrics.push({
        operation: 'Parallel Queries (Cached)',
        startTime: test4Start,
        endTime: test4End,
        duration: test4End - test4Start,
        cacheHit: true,
      });

      // テスト4: プリフェッチ性能
      const test5Start = performance.now();
      
      await Promise.all([
        cacheUtils.prefetchQuery(
          ['test-prefetch-1'],
          () => new Promise(resolve => setTimeout(() => resolve({ data: 'test1' }), 100)),
          { staleTime: 5000 }
        ),
        cacheUtils.prefetchQuery(
          ['test-prefetch-2'],
          () => new Promise(resolve => setTimeout(() => resolve({ data: 'test2' }), 150)),
          { staleTime: 5000 }
        ),
      ]);
      
      const test5End = performance.now();
      
      newMetrics.push({
        operation: 'Prefetch Operations',
        startTime: test5Start,
        endTime: test5End,
        duration: test5End - test5Start,
        cacheHit: false,
      });

      setMetrics(prev => [...prev, ...newMetrics]);

      // 結果をコンソールに出力
      console.log('🧪 Cache Performance Test - Results:');
      console.table(newMetrics.map(m => ({
        Operation: m.operation,
        'Duration (ms)': m.duration.toFixed(2),
        'Cache Hit': m.cacheHit ? '✅' : '❌',
        'Data Size (bytes)': m.dataSize || 'N/A',
      })));

      // パフォーマンス比較
      const cacheMiss = newMetrics.find(m => m.operation.includes('Cache Miss'));
      const cacheHit = newMetrics.find(m => m.operation.includes('Cache Hit'));
      
      if (cacheMiss && cacheHit) {
        const improvement = ((cacheMiss.duration - cacheHit.duration) / cacheMiss.duration * 100);
        console.log(`📈 Cache Performance Improvement: ${improvement.toFixed(1)}%`);
        console.log(`⚡ Speed Up: ${(cacheMiss.duration / cacheHit.duration).toFixed(1)}x faster`);
      }

    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, [alertSettings, notifications, refetchAlertSettings, refetchNotifications]);

  // メトリクスクリア
  const clearMetrics = useCallback(() => {
    setMetrics([]);
    console.log('🧹 Performance metrics cleared');
  }, []);

  // メトリクスのエクスポート
  const exportMetrics = useCallback(() => {
    const summary = {
      testDate: new Date().toISOString(),
      totalTests: metrics.length,
      averageDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      cacheHitRatio: metrics.filter(m => m.cacheHit).length / metrics.length,
      metrics,
    };

    const dataStr = JSON.stringify(summary, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `cache-performance-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('📊 Performance metrics exported');
  }, [metrics]);

  // ベンチマーク比較
  const getBenchmarkComparison = useCallback(() => {
    if (metrics.length === 0) return null;

    const cacheMissMetrics = metrics.filter(m => !m.cacheHit);
    const cacheHitMetrics = metrics.filter(m => m.cacheHit);

    const avgCacheMiss = cacheMissMetrics.reduce((sum, m) => sum + m.duration, 0) / cacheMissMetrics.length;
    const avgCacheHit = cacheHitMetrics.reduce((sum, m) => sum + m.duration, 0) / cacheHitMetrics.length;

    return {
      avgCacheMiss,
      avgCacheHit,
      improvement: cacheHitMetrics.length > 0 ? ((avgCacheMiss - avgCacheHit) / avgCacheMiss * 100) : 0,
      speedup: cacheHitMetrics.length > 0 ? (avgCacheMiss / avgCacheHit) : 1,
    };
  }, [metrics]);

  return {
    metrics,
    isRunning,
    runPerformanceTest,
    clearMetrics,
    exportMetrics,
    getBenchmarkComparison,
  };
};