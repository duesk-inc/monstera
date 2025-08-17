/**
 * インターセプター最適化ユーティリティ
 * インターセプターチェーンのパフォーマンスを最適化
 */

import { AxiosInstance } from 'axios';
import { InterceptorType } from '@/lib/api/factory/interceptors';

/**
 * インターセプター実行順序の定義
 * パフォーマンスを最適化するための推奨順序
 */
export const INTERCEPTOR_PRIORITY: Record<InterceptorType, number> = {
  // 早期実行（前処理）
  'logging': 1,      // ロギングは最初に実行（計測のため）
  'auth': 2,         // 認証ヘッダーの追加
  
  // 中間処理
  'custom': 3,       // カスタム処理
  
  // 後期実行（エラー処理）
  'retry': 4,        // リトライロジック
  'error': 5,        // エラーハンドリング（最後）
};

/**
 * インターセプター最適化設定
 */
export interface InterceptorOptimizationConfig {
  // 実行条件
  skipOnSuccess?: boolean;           // 成功時はスキップ
  skipOnCachedResponse?: boolean;    // キャッシュヒット時はスキップ
  conditionalExecution?: boolean;    // 条件付き実行を有効化
  
  // パフォーマンス設定
  maxExecutionTime?: number;         // 最大実行時間（ミリ秒）
  enableProfiling?: boolean;         // プロファイリングを有効化
  
  // 最適化設定
  parallelExecution?: boolean;       // 並列実行を許可
  lazyLoading?: boolean;            // 遅延ローディング
}

/**
 * インターセプターの実行統計
 */
export interface InterceptorStats {
  type: InterceptorType;
  executionCount: number;
  totalTime: number;
  averageTime: number;
  maxTime: number;
  minTime: number;
  errors: number;
}

/**
 * インターセプター最適化クラス
 */
export class InterceptorOptimizer {
  private stats: Map<InterceptorType, InterceptorStats> = new Map();
  private executionOrder: InterceptorType[] = [];
  private config: InterceptorOptimizationConfig;
  
  constructor(config: InterceptorOptimizationConfig = {}) {
    this.config = {
      skipOnSuccess: true,
      skipOnCachedResponse: true,
      conditionalExecution: true,
      maxExecutionTime: 100, // 100ms
      enableProfiling: process.env.NODE_ENV === 'development',
      parallelExecution: false,
      lazyLoading: true,
      ...config,
    };
  }
  
  /**
   * インターセプターの実行順序を最適化
   */
  optimizeExecutionOrder(types: InterceptorType[]): InterceptorType[] {
    // 優先度に基づいてソート
    const sorted = [...types].sort((a, b) => {
      const priorityA = INTERCEPTOR_PRIORITY[a] || 99;
      const priorityB = INTERCEPTOR_PRIORITY[b] || 99;
      return priorityA - priorityB;
    });
    
    // 統計情報に基づいて動的に調整
    if (this.stats.size > 0) {
      sorted.sort((a, b) => {
        const statsA = this.stats.get(a);
        const statsB = this.stats.get(b);
        
        if (statsA && statsB) {
          // エラー率が高いものは後ろに
          const errorRateA = statsA.errors / statsA.executionCount;
          const errorRateB = statsB.errors / statsB.executionCount;
          
          if (errorRateA > 0.1 || errorRateB > 0.1) {
            return errorRateA - errorRateB;
          }
          
          // 実行時間が短いものを先に
          return statsA.averageTime - statsB.averageTime;
        }
        
        return 0;
      });
    }
    
    this.executionOrder = sorted;
    return sorted;
  }
  
  /**
   * インターセプターの実行を記録
   */
  recordExecution(
    type: InterceptorType,
    executionTime: number,
    success: boolean = true
  ): void {
    if (!this.config.enableProfiling) {
      return;
    }
    
    const stats = this.stats.get(type) || {
      type,
      executionCount: 0,
      totalTime: 0,
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity,
      errors: 0,
    };
    
    stats.executionCount++;
    stats.totalTime += executionTime;
    stats.averageTime = stats.totalTime / stats.executionCount;
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    stats.minTime = Math.min(stats.minTime, executionTime);
    
    if (!success) {
      stats.errors++;
    }
    
    this.stats.set(type, stats);
    
    // 実行時間が閾値を超えた場合の警告
    if (executionTime > this.config.maxExecutionTime!) {
      console.warn(
        `[InterceptorOptimizer] ${type} interceptor took ${executionTime}ms (threshold: ${this.config.maxExecutionTime}ms)`
      );
    }
  }
  
  /**
   * 条件付き実行の判定
   */
  shouldExecute(
    type: InterceptorType,
    context: {
      isCached?: boolean;
      isSuccess?: boolean;
      method?: string;
      url?: string;
    }
  ): boolean {
    if (!this.config.conditionalExecution) {
      return true;
    }
    
    // キャッシュヒット時のスキップ
    if (this.config.skipOnCachedResponse && context.isCached) {
      if (type === 'logging' || type === 'error') {
        return false;
      }
    }
    
    // 成功時のスキップ
    if (this.config.skipOnSuccess && context.isSuccess) {
      if (type === 'retry' || type === 'error') {
        return false;
      }
    }
    
    // メソッド別の最適化
    if (context.method === 'GET') {
      // GETリクエストではリトライを優先
      if (type === 'retry') {
        return true;
      }
    }
    
    // URL別の最適化
    if (context.url?.includes('/health') || context.url?.includes('/ping')) {
      // ヘルスチェックではロギングとエラーハンドリングのみ
      return type === 'logging' || type === 'error';
    }
    
    return true;
  }
  
  /**
   * インターセプターの遅延ローディング
   */
  async lazyLoadInterceptor(
    type: InterceptorType
  ): Promise<Function | null> {
    if (!this.config.lazyLoading) {
      return null;
    }
    
    // 必要に応じてインターセプターを動的にインポート
    switch (type) {
      case 'retry':
        // リトライインターセプターは必要時のみロード
        const { setupRetry } = await import('@/lib/api/factory/interceptors');
        return setupRetry;
      
      case 'logging':
        // 開発環境でのみロギングインターセプターをロード
        if (process.env.NODE_ENV === 'development') {
          const { setupLogging } = await import('@/lib/api/factory/interceptors');
          return setupLogging;
        }
        return null;
      
      default:
        return null;
    }
  }
  
  /**
   * 統計情報を取得
   */
  getStats(): Map<InterceptorType, InterceptorStats> {
    return new Map(this.stats);
  }
  
  /**
   * 統計情報をリセット
   */
  resetStats(): void {
    this.stats.clear();
  }
  
  /**
   * 最適化レポートを生成
   */
  generateOptimizationReport(): string {
    const report: string[] = [
      '=== Interceptor Optimization Report ===',
      `Execution Order: ${this.executionOrder.join(' → ')}`,
      '',
      'Performance Statistics:',
    ];
    
    this.stats.forEach((stats, type) => {
      report.push(
        `  ${type}:`,
        `    - Executions: ${stats.executionCount}`,
        `    - Avg Time: ${stats.averageTime.toFixed(2)}ms`,
        `    - Max Time: ${stats.maxTime}ms`,
        `    - Min Time: ${stats.minTime === Infinity ? 0 : stats.minTime}ms`,
        `    - Error Rate: ${((stats.errors / stats.executionCount) * 100).toFixed(1)}%`
      );
    });
    
    // パフォーマンス改善の提案
    report.push('', 'Optimization Suggestions:');
    
    this.stats.forEach((stats, type) => {
      if (stats.averageTime > 50) {
        report.push(`  ⚠️ ${type}: Consider optimizing (avg time > 50ms)`);
      }
      
      if (stats.errors / stats.executionCount > 0.1) {
        report.push(`  ⚠️ ${type}: High error rate (> 10%)`);
      }
    });
    
    return report.join('\n');
  }
}

// シングルトンインスタンス
export const interceptorOptimizer = new InterceptorOptimizer();

/**
 * インターセプター実行時間を計測するデコレーター
 */
export function measureInterceptor(type: InterceptorType) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      let success = true;
      
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const executionTime = performance.now() - startTime;
        interceptorOptimizer.recordExecution(type, executionTime, success);
      }
    };
    
    return descriptor;
  };
}

// デフォルトエクスポート
export default interceptorOptimizer;