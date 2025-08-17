/**
 * APIクライアント移行用Feature Flag
 * 段階的な移行を制御するための機能フラグ
 */

import { createPresetApiClient, type ApiClientPresetType } from '@/lib/api/factory';
import apiClient from '@/lib/api';
import type { AxiosInstance } from 'axios';

/**
 * Feature Flag設定
 */
interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage: number;
  enabledPaths: string[];
  disabledPaths: string[];
  debugMode: boolean;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: FeatureFlagConfig = {
  enabled: process.env.NEXT_PUBLIC_USE_NEW_API === 'true',
  rolloutPercentage: parseInt(process.env.NEXT_PUBLIC_API_ROLLOUT_PERCENTAGE || '0', 10),
  enabledPaths: process.env.NEXT_PUBLIC_API_ENABLED_PATHS?.split(',') || [],
  disabledPaths: process.env.NEXT_PUBLIC_API_DISABLED_PATHS?.split(',') || [],
  debugMode: process.env.NODE_ENV === 'development',
};

/**
 * Feature Flag管理クラス
 */
export class ApiMigrationFeatureFlag {
  private config: FeatureFlagConfig;
  private userHash: string | null = null;
  private overrides: Map<string, boolean> = new Map();
  
  constructor(config: Partial<FeatureFlagConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // ユーザーハッシュを生成（ローカルストレージから取得または生成）
    if (typeof window !== 'undefined') {
      this.userHash = this.getUserHash();
    }
    
    // デバッグモードの場合、コンソールに情報を出力
    if (this.config.debugMode) {
      console.log('[API Migration] Feature Flag initialized:', {
        enabled: this.config.enabled,
        rolloutPercentage: this.config.rolloutPercentage,
        userHash: this.userHash,
      });
    }
  }
  
  /**
   * ユーザーハッシュを取得または生成
   */
  private getUserHash(): string {
    const key = 'api_migration_user_hash';
    let hash = localStorage.getItem(key);
    
    if (!hash) {
      hash = Math.random().toString(36).substring(2, 15);
      localStorage.setItem(key, hash);
    }
    
    return hash;
  }
  
  /**
   * ハッシュから数値を生成（0-100）
   */
  private hashToPercentage(hash: string): number {
    let sum = 0;
    for (let i = 0; i < hash.length; i++) {
      sum += hash.charCodeAt(i);
    }
    return sum % 100;
  }
  
  /**
   * 新APIシステムを使用するかどうかを判定
   */
  shouldUseNewApi(path?: string): boolean {
    // 明示的なオーバーライドがある場合
    if (path && this.overrides.has(path)) {
      return this.overrides.get(path)!;
    }
    
    // グローバルフラグが無効の場合
    if (!this.config.enabled) {
      return false;
    }
    
    // パス別の制御
    if (path) {
      // 無効化リストに含まれる場合
      if (this.config.disabledPaths.some(p => path.startsWith(p))) {
        return false;
      }
      
      // 有効化リストに含まれる場合
      if (this.config.enabledPaths.length > 0) {
        return this.config.enabledPaths.some(p => path.startsWith(p));
      }
    }
    
    // パーセンテージベースのロールアウト
    if (this.config.rolloutPercentage > 0 && this.config.rolloutPercentage < 100) {
      if (this.userHash) {
        const userPercentage = this.hashToPercentage(this.userHash);
        return userPercentage < this.config.rolloutPercentage;
      }
    }
    
    // 100%ロールアウトまたは0%の場合
    return this.config.rolloutPercentage >= 100;
  }
  
  /**
   * APIクライアントを取得（Feature Flagに基づいて新旧を切り替え）
   */
  getApiClient(preset: ApiClientPresetType = 'default', path?: string): AxiosInstance {
    const useNewApi = this.shouldUseNewApi(path);
    
    if (this.config.debugMode) {
      console.log(`[API Migration] Using ${useNewApi ? 'NEW' : 'OLD'} API client for path: ${path || 'default'}`);
    }
    
    if (useNewApi) {
      return createPresetApiClient(preset);
    }
    
    // 旧システムを返す
    return apiClient;
  }
  
  /**
   * 特定のパスに対してフラグをオーバーライド
   */
  setOverride(path: string, enabled: boolean): void {
    this.overrides.set(path, enabled);
    
    if (this.config.debugMode) {
      console.log(`[API Migration] Override set for ${path}: ${enabled}`);
    }
  }
  
  /**
   * オーバーライドをクリア
   */
  clearOverride(path?: string): void {
    if (path) {
      this.overrides.delete(path);
    } else {
      this.overrides.clear();
    }
  }
  
  /**
   * 設定を更新
   */
  updateConfig(config: Partial<FeatureFlagConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.debugMode) {
      console.log('[API Migration] Config updated:', this.config);
    }
  }
  
  /**
   * 現在の状態を取得
   */
  getStatus(): {
    enabled: boolean;
    rolloutPercentage: number;
    userInRollout: boolean;
    overrides: Record<string, boolean>;
  } {
    const userInRollout = this.userHash 
      ? this.hashToPercentage(this.userHash) < this.config.rolloutPercentage
      : false;
    
    return {
      enabled: this.config.enabled,
      rolloutPercentage: this.config.rolloutPercentage,
      userInRollout,
      overrides: Object.fromEntries(this.overrides),
    };
  }
  
  /**
   * A/Bテスト用のメトリクス記録
   */
  recordMetric(eventName: string, metadata: Record<string, any> = {}): void {
    const useNewApi = this.shouldUseNewApi();
    
    // メトリクス記録（実際の実装では分析ツールに送信）
    const metric = {
      event: eventName,
      variant: useNewApi ? 'new_api' : 'old_api',
      timestamp: Date.now(),
      userHash: this.userHash,
      ...metadata,
    };
    
    if (this.config.debugMode) {
      console.log('[API Migration] Metric recorded:', metric);
    }
    
    // 実際の環境では Google Analytics、Segment などに送信
    // if (typeof window !== 'undefined' && window.gtag) {
    //   window.gtag('event', eventName, {
    //     custom_dimension_1: metric.variant,
    //     ...metadata,
    //   });
    // }
  }
}

// シングルトンインスタンス
export const apiMigrationFlag = new ApiMigrationFeatureFlag();

/**
 * React Hook for Feature Flag
 */
export function useApiMigrationFlag(path?: string) {
  const shouldUseNewApi = apiMigrationFlag.shouldUseNewApi(path);
  
  return {
    shouldUseNewApi,
    getClient: (preset: ApiClientPresetType = 'default') => 
      apiMigrationFlag.getApiClient(preset, path),
    recordMetric: (eventName: string, metadata?: Record<string, any>) =>
      apiMigrationFlag.recordMetric(eventName, metadata),
  };
}

/**
 * 移行ヘルパー関数
 * 既存コードを最小限の変更で移行するための関数
 */
export function getMigratedApiClient(
  preset: ApiClientPresetType = 'auth',
  forceMigration?: boolean
): AxiosInstance {
  if (forceMigration === true) {
    return createPresetApiClient(preset);
  }
  
  if (forceMigration === false) {
    return apiClient;
  }
  
  // Feature Flagに基づいて判定
  return apiMigrationFlag.getApiClient(preset);
}

/**
 * デバッグツール（開発環境のみ）
 */
export const ApiMigrationDebugTools = {
  /**
   * 強制的に新APIを使用
   */
  forceNewApi(): void {
    apiMigrationFlag.updateConfig({ enabled: true, rolloutPercentage: 100 });
    console.log('[API Migration] Forced to use NEW API');
  },
  
  /**
   * 強制的に旧APIを使用
   */
  forceOldApi(): void {
    apiMigrationFlag.updateConfig({ enabled: false });
    console.log('[API Migration] Forced to use OLD API');
  },
  
  /**
   * 特定のパーセンテージでロールアウト
   */
  setRolloutPercentage(percentage: number): void {
    apiMigrationFlag.updateConfig({ 
      enabled: true, 
      rolloutPercentage: Math.max(0, Math.min(100, percentage)) 
    });
    console.log(`[API Migration] Rollout percentage set to ${percentage}%`);
  },
  
  /**
   * 現在の状態を表示
   */
  showStatus(): void {
    console.table(apiMigrationFlag.getStatus());
  },
  
  /**
   * パフォーマンス比較テスト
   */
  async performanceTest(url: string): Promise<void> {
    console.log('[API Migration] Starting performance test...');
    
    // 旧API
    const oldApiStart = performance.now();
    try {
      await apiClient.get(url);
    } catch (error) {
      // エラーは無視
    }
    const oldApiTime = performance.now() - oldApiStart;
    
    // 新API
    const newApiStart = performance.now();
    try {
      await createPresetApiClient('default').get(url);
    } catch (error) {
      // エラーは無視
    }
    const newApiTime = performance.now() - newApiStart;
    
    console.table({
      'Old API': `${oldApiTime.toFixed(2)}ms`,
      'New API': `${newApiTime.toFixed(2)}ms`,
      'Improvement': `${((1 - newApiTime / oldApiTime) * 100).toFixed(1)}%`,
    });
  },
};

// 開発環境でのみグローバルに公開
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).ApiMigrationDebugTools = ApiMigrationDebugTools;
  console.log('[API Migration] Debug tools available at window.ApiMigrationDebugTools');
}