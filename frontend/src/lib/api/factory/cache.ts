/**
 * APIクライアントキャッシュ管理
 * LRU戦略でクライアントインスタンスをキャッシュ
 */

import { AxiosInstance } from 'axios';

export interface CacheEntry {
  client: AxiosInstance;
  createdAt: Date;
  lastUsed: Date;
  hitCount: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  averageHitRate: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export class ApiClientCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private totalHits = 0;
  private totalMisses = 0;

  constructor(maxSize = 10) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * キャッシュからクライアントを取得
   * @param key キャッシュキー
   * @returns クライアントインスタンスまたはnull
   */
  get(key: string): AxiosInstance | null {
    const entry = this.cache.get(key);
    
    if (entry) {
      // LRU: 使用時刻を更新
      entry.lastUsed = new Date();
      entry.hitCount++;
      this.totalHits++;
      
      // Map内での順序を更新（末尾に移動）
      this.cache.delete(key);
      this.cache.set(key, entry);
      
      return entry.client;
    }
    
    this.totalMisses++;
    return null;
  }

  /**
   * キャッシュにクライアントを設定
   * @param key キャッシュキー
   * @param client クライアントインスタンス
   */
  set(key: string, client: AxiosInstance): void {
    // 既存のエントリがある場合は削除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // キャッシュサイズ制限のチェック
    if (this.cache.size >= this.maxSize) {
      // LRU: 最も古いエントリ（先頭）を削除
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    // 新しいエントリを追加（末尾）
    const now = new Date();
    this.cache.set(key, {
      client,
      createdAt: now,
      lastUsed: now,
      hitCount: 0
    });
  }

  /**
   * キャッシュから特定のエントリを削除
   * @param key キャッシュキー
   * @returns 削除されたかどうか
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  /**
   * キャッシュ統計を取得
   * @returns キャッシュ統計
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.totalHits + this.totalMisses;
    
    return {
      totalEntries: this.cache.size,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      averageHitRate: totalRequests > 0 ? this.totalHits / totalRequests : 0,
      oldestEntry: entries.length > 0 
        ? entries.reduce((min, e) => e.createdAt < min ? e.createdAt : min, entries[0].createdAt)
        : null,
      newestEntry: entries.length > 0
        ? entries.reduce((max, e) => e.createdAt > max ? e.createdAt : max, entries[0].createdAt)
        : null
    };
  }

  /**
   * 自動クリーンアップタイマーを開始
   * @param intervalMs クリーンアップ間隔（ミリ秒）
   * @param maxAge 最大エントリ寿命（ミリ秒）
   */
  startCleanupTimer(intervalMs = 60000, maxAge = 300000): void {
    this.stopCleanupTimer();
    
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const keysToDelete: string[] = [];
      
      // 古いエントリを特定
      this.cache.forEach((entry, key) => {
        const age = now.getTime() - entry.createdAt.getTime();
        if (age > maxAge) {
          keysToDelete.push(key);
        }
      });
      
      // 古いエントリを削除
      keysToDelete.forEach(key => this.cache.delete(key));
      
      if (keysToDelete.length > 0) {
        console.debug(`[ApiClientCache] Cleaned up ${keysToDelete.length} old entries`);
      }
    }, intervalMs);
  }

  /**
   * 自動クリーンアップタイマーを停止
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * キャッシュサイズを取得
   * @returns キャッシュ内のエントリ数
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 特定のキーが存在するか確認
   * @param key キャッシュキー
   * @returns 存在するかどうか
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }
}