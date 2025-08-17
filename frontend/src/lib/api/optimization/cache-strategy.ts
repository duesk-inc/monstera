/**
 * APIキャッシュ戦略の最適化
 * 動的キャッシュサイズ調整と無効化戦略
 */

import { AxiosInstance } from 'axios';

/**
 * キャッシュエントリのメタデータ
 */
export interface CacheMetadata {
  key: string;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  size: number;          // バイト数
  ttl: number;           // Time To Live (ミリ秒)
  priority: number;      // 優先度（0-10）
  tags: string[];        // タグ（グループ化用）
}

/**
 * キャッシュヒット率の統計
 */
export interface CacheStatistics {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  averageAccessTime: number;
  totalSize: number;
  entryCount: number;
}

/**
 * キャッシュ戦略の設定
 */
export interface CacheStrategyConfig {
  // サイズ設定
  minSize: number;              // 最小キャッシュサイズ
  maxSize: number;              // 最大キャッシュサイズ
  maxMemoryUsage: number;       // 最大メモリ使用量（バイト）
  
  // TTL設定
  defaultTTL: number;           // デフォルトTTL（ミリ秒）
  maxTTL: number;              // 最大TTL
  
  // 動的調整
  enableDynamicSizing: boolean; // 動的サイズ調整
  enableAdaptiveTTL: boolean;   // 適応的TTL
  
  // 無効化戦略
  invalidationStrategy: 'lru' | 'lfu' | 'fifo' | 'adaptive';
  
  // パフォーマンス
  compressionEnabled: boolean;  // 圧縮を有効化
  preloadEnabled: boolean;      // プリロードを有効化
}

/**
 * 高度なキャッシュ戦略クラス
 */
export class AdvancedCacheStrategy {
  private cache: Map<string, { client: AxiosInstance; metadata: CacheMetadata }> = new Map();
  private statistics: CacheStatistics;
  private config: CacheStrategyConfig;
  private memoryUsage: number = 0;
  private hitRateHistory: number[] = [];
  
  constructor(config: Partial<CacheStrategyConfig> = {}) {
    this.config = {
      minSize: 10,
      maxSize: 50,
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      defaultTTL: 5 * 60 * 1000, // 5分
      maxTTL: 30 * 60 * 1000, // 30分
      enableDynamicSizing: true,
      enableAdaptiveTTL: true,
      invalidationStrategy: 'adaptive',
      compressionEnabled: false,
      preloadEnabled: false,
      ...config,
    };
    
    this.statistics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0,
      averageAccessTime: 0,
      totalSize: 0,
      entryCount: 0,
    };
    
    // 定期的な最適化タスク
    this.startOptimizationTasks();
  }
  
  /**
   * キャッシュからクライアントを取得
   */
  get(key: string): AxiosInstance | null {
    const startTime = performance.now();
    const entry = this.cache.get(key);
    
    if (entry) {
      const { client, metadata } = entry;
      
      // TTLチェック
      if (this.isExpired(metadata)) {
        this.evict(key);
        this.statistics.misses++;
        return null;
      }
      
      // メタデータ更新
      metadata.lastAccessedAt = Date.now();
      metadata.accessCount++;
      
      // 統計更新
      this.statistics.hits++;
      this.updateHitRate();
      
      // アクセス時間記録
      const accessTime = performance.now() - startTime;
      this.updateAverageAccessTime(accessTime);
      
      return client;
    }
    
    this.statistics.misses++;
    this.updateHitRate();
    return null;
  }
  
  /**
   * キャッシュにクライアントを設定
   */
  set(key: string, client: AxiosInstance, options: Partial<CacheMetadata> = {}): void {
    // キャッシュサイズチェック
    if (this.cache.size >= this.getCurrentMaxSize()) {
      this.evictByStrategy();
    }
    
    // メモリ使用量チェック
    const estimatedSize = this.estimateSize(client);
    if (this.memoryUsage + estimatedSize > this.config.maxMemoryUsage) {
      this.evictUntilMemoryAvailable(estimatedSize);
    }
    
    // メタデータ作成
    const metadata: CacheMetadata = {
      key,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      size: estimatedSize,
      ttl: options.ttl || this.getAdaptiveTTL(key),
      priority: options.priority || 5,
      tags: options.tags || [],
    };
    
    // キャッシュに追加
    this.cache.set(key, { client, metadata });
    this.memoryUsage += estimatedSize;
    this.statistics.entryCount = this.cache.size;
    this.statistics.totalSize = this.memoryUsage;
  }
  
  /**
   * キャッシュエントリを削除
   */
  evict(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.memoryUsage -= entry.metadata.size;
      this.cache.delete(key);
      this.statistics.evictions++;
      this.statistics.entryCount = this.cache.size;
      this.statistics.totalSize = this.memoryUsage;
      return true;
    }
    return false;
  }
  
  /**
   * タグによる一括無効化
   */
  invalidateByTags(tags: string[]): number {
    let invalidatedCount = 0;
    
    this.cache.forEach((entry, key) => {
      const hasTag = tags.some(tag => entry.metadata.tags.includes(tag));
      if (hasTag) {
        this.evict(key);
        invalidatedCount++;
      }
    });
    
    return invalidatedCount;
  }
  
  /**
   * パターンによる無効化
   */
  invalidateByPattern(pattern: RegExp): number {
    let invalidatedCount = 0;
    
    this.cache.forEach((entry, key) => {
      if (pattern.test(key)) {
        this.evict(key);
        invalidatedCount++;
      }
    });
    
    return invalidatedCount;
  }
  
  /**
   * 全キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.memoryUsage = 0;
    this.statistics.entryCount = 0;
    this.statistics.totalSize = 0;
  }
  
  /**
   * TTLが期限切れかチェック
   */
  private isExpired(metadata: CacheMetadata): boolean {
    return Date.now() - metadata.createdAt > metadata.ttl;
  }
  
  /**
   * 戦略に基づいて削除
   */
  private evictByStrategy(): void {
    switch (this.config.invalidationStrategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      case 'fifo':
        this.evictFIFO();
        break;
      case 'adaptive':
        this.evictAdaptive();
        break;
    }
  }
  
  /**
   * LRU（Least Recently Used）戦略
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    this.cache.forEach((entry, key) => {
      if (entry.metadata.lastAccessedAt < oldestTime) {
        oldestTime = entry.metadata.lastAccessedAt;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.evict(oldestKey);
    }
  }
  
  /**
   * LFU（Least Frequently Used）戦略
   */
  private evictLFU(): void {
    let leastUsedKey: string | null = null;
    let minAccessCount = Infinity;
    
    this.cache.forEach((entry, key) => {
      const frequency = entry.metadata.accessCount / 
        (Date.now() - entry.metadata.createdAt);
      
      if (frequency < minAccessCount) {
        minAccessCount = frequency;
        leastUsedKey = key;
      }
    });
    
    if (leastUsedKey) {
      this.evict(leastUsedKey);
    }
  }
  
  /**
   * FIFO（First In First Out）戦略
   */
  private evictFIFO(): void {
    let oldestKey: string | null = null;
    let oldestCreatedAt = Infinity;
    
    this.cache.forEach((entry, key) => {
      if (entry.metadata.createdAt < oldestCreatedAt) {
        oldestCreatedAt = entry.metadata.createdAt;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.evict(oldestKey);
    }
  }
  
  /**
   * 適応的削除戦略
   */
  private evictAdaptive(): void {
    // スコア計算（低いほど削除対象）
    const scores = new Map<string, number>();
    
    this.cache.forEach((entry, key) => {
      const { metadata } = entry;
      const age = Date.now() - metadata.createdAt;
      const recency = Date.now() - metadata.lastAccessedAt;
      const frequency = metadata.accessCount;
      const priority = metadata.priority;
      
      // スコア計算式
      const score = 
        (frequency * 1000 / age) * // 頻度/経過時間
        (1 / (recency + 1)) *      // 最近のアクセス
        (priority / 10);            // 優先度
      
      scores.set(key, score);
    });
    
    // 最もスコアが低いエントリを削除
    let lowestKey: string | null = null;
    let lowestScore = Infinity;
    
    scores.forEach((score, key) => {
      if (score < lowestScore) {
        lowestScore = score;
        lowestKey = key;
      }
    });
    
    if (lowestKey) {
      this.evict(lowestKey);
    }
  }
  
  /**
   * メモリが利用可能になるまで削除
   */
  private evictUntilMemoryAvailable(requiredSize: number): void {
    while (this.memoryUsage + requiredSize > this.config.maxMemoryUsage && this.cache.size > 0) {
      this.evictByStrategy();
    }
  }
  
  /**
   * サイズ推定
   */
  private estimateSize(client: AxiosInstance): number {
    // 簡易的なサイズ推定（実際にはより正確な計算が必要）
    return JSON.stringify(client.defaults).length * 2; // UTF-16
  }
  
  /**
   * 適応的TTLを取得
   */
  private getAdaptiveTTL(key: string): number {
    if (!this.config.enableAdaptiveTTL) {
      return this.config.defaultTTL;
    }
    
    // キーのパターンに基づいてTTLを調整
    if (key.includes('user') || key.includes('auth')) {
      return 10 * 60 * 1000; // 10分
    }
    
    if (key.includes('config') || key.includes('settings')) {
      return 30 * 60 * 1000; // 30分
    }
    
    if (key.includes('temp') || key.includes('draft')) {
      return 1 * 60 * 1000; // 1分
    }
    
    // ヒット率に基づいて調整
    if (this.statistics.hitRate > 0.8) {
      return Math.min(this.config.defaultTTL * 1.5, this.config.maxTTL);
    }
    
    return this.config.defaultTTL;
  }
  
  /**
   * 動的な最大サイズを取得
   */
  private getCurrentMaxSize(): number {
    if (!this.config.enableDynamicSizing) {
      return this.config.maxSize;
    }
    
    // ヒット率に基づいてサイズを調整
    if (this.statistics.hitRate > 0.9) {
      // ヒット率が高い場合はサイズを増やす
      return Math.min(this.config.maxSize * 1.2, this.config.maxSize);
    } else if (this.statistics.hitRate < 0.5) {
      // ヒット率が低い場合はサイズを減らす
      return Math.max(this.config.minSize, this.config.maxSize * 0.8);
    }
    
    return this.config.maxSize;
  }
  
  /**
   * ヒット率を更新
   */
  private updateHitRate(): void {
    const total = this.statistics.hits + this.statistics.misses;
    if (total > 0) {
      this.statistics.hitRate = this.statistics.hits / total;
      this.hitRateHistory.push(this.statistics.hitRate);
      
      // 履歴を100件に制限
      if (this.hitRateHistory.length > 100) {
        this.hitRateHistory.shift();
      }
    }
  }
  
  /**
   * 平均アクセス時間を更新
   */
  private updateAverageAccessTime(accessTime: number): void {
    const alpha = 0.1; // 指数移動平均の係数
    this.statistics.averageAccessTime = 
      alpha * accessTime + (1 - alpha) * this.statistics.averageAccessTime;
  }
  
  /**
   * 定期的な最適化タスクを開始
   */
  private startOptimizationTasks(): void {
    // 期限切れエントリの削除（1分ごと）
    setInterval(() => {
      this.removeExpiredEntries();
    }, 60 * 1000);
    
    // 統計のリセット（1時間ごと）
    setInterval(() => {
      this.resetStatistics();
    }, 60 * 60 * 1000);
  }
  
  /**
   * 期限切れエントリを削除
   */
  private removeExpiredEntries(): void {
    const keysToRemove: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry.metadata)) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => this.evict(key));
  }
  
  /**
   * 統計をリセット
   */
  private resetStatistics(): void {
    this.statistics.hits = 0;
    this.statistics.misses = 0;
    this.statistics.evictions = 0;
    this.hitRateHistory = [];
  }
  
  /**
   * キャッシュ統計を取得
   */
  getStatistics(): CacheStatistics {
    return { ...this.statistics };
  }
  
  /**
   * キャッシュメトリクスのエクスポート
   */
  exportMetrics(): object {
    return {
      statistics: this.getStatistics(),
      config: this.config,
      hitRateHistory: this.hitRateHistory,
      memoryUsage: this.memoryUsage,
      cacheSize: this.cache.size,
    };
  }
}

// シングルトンインスタンス
export const advancedCacheStrategy = new AdvancedCacheStrategy();

// デフォルトエクスポート
export default advancedCacheStrategy;