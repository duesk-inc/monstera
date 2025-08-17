/**
 * 統合APIクライアントファクトリ
 * キャッシュ管理とインターセプター重複防止機構を持つ
 */

import axios, { AxiosInstance } from 'axios';
import { getApiEnvironment } from '@/lib/api/config/env';
import { ApiClientCache } from './cache';
import { InterceptorManager } from './interceptors';
import { DebugLogger } from '@/lib/debug/logger';
import { getUnifiedApiConfig } from '@/lib/api/config/unified';

/**
 * プリセットタイプの定義
 */
export type ApiClientPresetType = 
  | 'default'      // デフォルト設定
  | 'auth'         // 認証API用
  | 'admin'        // 管理者API用
  | 'public'       // 公開API用（認証不要）
  | 'upload'       // ファイルアップロード用
  | 'batch'        // バッチ処理用（長いタイムアウト）
  | 'realtime';    // リアルタイム通信用（短いタイムアウト）

/**
 * 統合API設定インターフェース
 */
export interface UnifiedApiConfig {
  // 基本設定
  baseURL?: string;
  host?: string;
  version?: string;
  timeout?: number;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  
  // プリセット設定
  preset?: ApiClientPresetType;
  
  // インターセプター設定
  enableAuth?: boolean;
  enableRetry?: boolean;
  enableLogging?: boolean;
  enableErrorHandling?: boolean;
  
  // リトライ設定
  maxRetries?: number;
  retryDelay?: number;
  
  // キャッシュ設定
  cacheKey?: string;
  useCache?: boolean;
  
  // 環境設定
  environment?: 'development' | 'staging' | 'production';
  
  // 認証設定
  authToken?: string;
}

/**
 * デフォルト設定（統一設定から取得）
 */
const getDefaultConfig = (): UnifiedApiConfig => {
  const unifiedConfig = getUnifiedApiConfig();
  return {
    timeout: unifiedConfig.timeout || 30000,
    withCredentials: unifiedConfig.withCredentials,
    headers: unifiedConfig.headers || {
      'Content-Type': 'application/json',
    },
    enableAuth: true,
    enableRetry: true,
    enableLogging: process.env.NODE_ENV === 'development',
    enableErrorHandling: true,
    maxRetries: 3,
    retryDelay: 1000,
    useCache: true,
  };
};

/**
 * 統合APIファクトリクラス
 */
export class UnifiedApiFactory {
  private static instance: UnifiedApiFactory;
  private cache: ApiClientCache;
  private interceptorManager: InterceptorManager;
  private defaultClient: AxiosInstance | null = null;
  
  private constructor() {
    this.cache = new ApiClientCache(20); // 最大20クライアントをキャッシュ
    this.interceptorManager = new InterceptorManager();
    
    // 開発環境では自動クリーンアップを有効化
    if (process.env.NODE_ENV === 'development') {
      // 5分ごとに、10分以上古いエントリをクリーンアップ
      this.cache.startCleanupTimer(300000, 600000);
    }
  }
  
  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): UnifiedApiFactory {
    if (!UnifiedApiFactory.instance) {
      UnifiedApiFactory.instance = new UnifiedApiFactory();
    }
    return UnifiedApiFactory.instance;
  }
  
  /**
   * 統合されたクライアントを作成
   * @param config 設定オプション
   * @returns Axiosインスタンス
   */
  createClient(config: UnifiedApiConfig = {}): AxiosInstance {
    // プリセット設定を適用
    const presetConfig = config.preset ? this.getPresetConfig(config.preset) : {};
    const mergedConfig = { ...getDefaultConfig(), ...presetConfig, ...config };
    
    // キャッシュキーの生成
    if (mergedConfig.useCache && mergedConfig.cacheKey) {
      const cached = this.cache.get(mergedConfig.cacheKey);
      if (cached) {
        DebugLogger.info({
          category: 'API',
          operation: 'キャッシュヒット'
        }, `キャッシュからクライアントを取得: ${mergedConfig.cacheKey}`);
        return cached;
      }
    }
    
    // baseURLの構築
    const baseURL = this.buildBaseURL(mergedConfig);
    
    // Axiosインスタンスを作成
    const client = axios.create({
      baseURL,
      timeout: mergedConfig.timeout,
      withCredentials: mergedConfig.withCredentials,
      headers: mergedConfig.headers,
    });
    
    // 認証トークンの設定
    if (mergedConfig.authToken) {
      client.defaults.headers.common['Authorization'] = `Bearer ${mergedConfig.authToken}`;
    }
    
    // インターセプターの設定（重複防止機構付き）
    this.setupInterceptors(client, mergedConfig);
    
    // キャッシュに保存
    if (mergedConfig.useCache && mergedConfig.cacheKey) {
      this.cache.set(mergedConfig.cacheKey, client);
      DebugLogger.info({
        category: 'API',
        operation: 'キャッシュ保存'
      }, `クライアントをキャッシュに保存: ${mergedConfig.cacheKey}`);
    }
    
    return client;
  }
  
  /**
   * デフォルトクライアントを作成
   * @returns Axiosインスタンス
   */
  createDefaultClient(): AxiosInstance {
    if (!this.defaultClient) {
      this.defaultClient = this.createClient({
        cacheKey: '_default',
        useCache: true,
      });
    }
    return this.defaultClient;
  }
  
  /**
   * 認証付きクライアントを作成
   * @param token 認証トークン（オプション）
   * @returns Axiosインスタンス
   */
  createAuthenticatedClient(token?: string): AxiosInstance {
    return this.createPresetClient('auth', {
      authToken: token,
      cacheKey: token ? `_auth_${token}` : '_preset_auth',
    });
  }
  
  /**
   * 管理者用クライアントを作成
   * @returns Axiosインスタンス
   */
  createAdminClient(): AxiosInstance {
    return this.createPresetClient('admin');
  }
  
  /**
   * バージョン指定クライアントを作成
   * @param version APIバージョン
   * @returns Axiosインスタンス
   */
  createVersionedClient(version: string): AxiosInstance {
    return this.createClient({
      cacheKey: `_version_${version}`,
      useCache: true,
      version,
    });
  }
  
  /**
   * 環境別クライアントを作成
   * @param environment 環境
   * @returns Axiosインスタンス
   */
  createEnvironmentClient(environment: 'development' | 'staging' | 'production'): AxiosInstance {
    return this.createClient({
      cacheKey: `_env_${environment}`,
      useCache: true,
      environment,
    });
  }
  
  /**
   * カスタム設定クライアントを作成（キャッシュなし）
   * @param config 設定オプション
   * @returns Axiosインスタンス
   */
  createCustomClient(config: UnifiedApiConfig): AxiosInstance {
    return this.createClient({
      ...config,
      useCache: false, // カスタムクライアントはキャッシュしない
    });
  }
  
  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.defaultClient = null;
    DebugLogger.info({
      category: 'API',
      operation: 'キャッシュクリア'
    }, 'すべてのクライアントキャッシュをクリア');
  }
  
  /**
   * 特定のキャッシュエントリを削除
   * @param cacheKey キャッシュキー
   * @returns 削除されたかどうか
   */
  removeFromCache(cacheKey: string): boolean {
    const removed = this.cache.delete(cacheKey);
    if (removed) {
      DebugLogger.info({
        category: 'API',
        operation: 'キャッシュ削除'
      }, `キャッシュエントリを削除: ${cacheKey}`);
    }
    return removed;
  }
  
  /**
   * キャッシュ統計を取得
   * @returns キャッシュ統計
   */
  getCacheStats() {
    return this.cache.getStats();
  }
  
  /**
   * キャッシュされたクライアントを取得
   * @param key キャッシュキー
   * @returns クライアントインスタンスまたはnull
   */
  getCachedClient(key: string): AxiosInstance | null {
    return this.cache.get(key);
  }
  
  /**
   * インターセプターの設定状態を取得
   * @param client Axiosインスタンス
   * @returns 登録されているインターセプタータイプの配列
   */
  getInterceptorStatus(client: AxiosInstance) {
    return this.interceptorManager.getRegisteredTypes(client);
  }
  
  /**
   * クライアントのインターセプターをすべて削除
   * @param client Axiosインスタンス
   */
  removeAllInterceptors(client: AxiosInstance): void {
    this.interceptorManager.removeAll(client);
    DebugLogger.info({
      category: 'API',
      operation: 'インターセプター削除'
    }, 'すべてのインターセプターを削除');
  }
  
  /**
   * baseURLを構築
   * @param config 設定オプション
   * @returns baseURL文字列
   */
  private buildBaseURL(config: UnifiedApiConfig): string {
    // 明示的なbaseURLが指定されている場合
    if (config.baseURL) {
      return config.baseURL;
    }
    
    // 環境別のホストを取得
    let host = config.host;
    if (!host && config.environment) {
      host = this.getEnvironmentHost(config.environment);
    }
    
    // ホストとバージョンから構築
    if (host && config.version) {
      return `${host}/api/${config.version}`;
    }
    
    // 環境変数から取得
    const envConfig = getApiEnvironment();
    
    // 環境変数のホストとバージョンから構築
    if (!host) {
      host = envConfig.host;
    }
    const version = config.version || envConfig.version;
    
    if (host && version) {
      return `${host}/api/${version}`;
    }
    
    // フォールバック：環境変数のbaseUrl
    return envConfig.baseUrl;
  }
  
  /**
   * 環境別のホストを取得
   * @param environment 環境
   * @returns ホストURL
   */
  private getEnvironmentHost(environment: 'development' | 'staging' | 'production'): string {
    switch (environment) {
      case 'development':
        return process.env.NEXT_PUBLIC_DEV_API_HOST || 'http://localhost:8080';
      case 'staging':
        return process.env.NEXT_PUBLIC_STAGING_API_HOST || 'https://staging-api.monstera.com';
      case 'production':
        return process.env.NEXT_PUBLIC_PRODUCTION_API_HOST || 'https://api.monstera.com';
      default:
        const envConfig = getApiEnvironment();
        return envConfig.host;
    }
  }
  
  /**
   * インターセプターをセットアップ
   * @param client Axiosインスタンス
   * @param config 設定オプション
   */
  private setupInterceptors(client: AxiosInstance, config: UnifiedApiConfig): void {
    // 認証インターセプター
    if (config.enableAuth) {
      this.interceptorManager.setupAuth(client);
    }
    
    // ロギングインターセプター（認証より先に設定）
    if (config.enableLogging) {
      this.interceptorManager.setupLogging(client);
    }
    
    // リトライインターセプター
    if (config.enableRetry) {
      this.interceptorManager.setupRetry(client, config.maxRetries, config.retryDelay);
    }
    
    // エラーハンドリングインターセプター（最後に設定）
    if (config.enableErrorHandling) {
      this.interceptorManager.setupErrorHandling(client);
    }
  }
  
  /**
   * プリセット設定を取得
   * @param preset プリセットタイプ
   * @returns プリセット設定
   */
  private getPresetConfig(preset: ApiClientPresetType): Partial<UnifiedApiConfig> {
    switch (preset) {
      case 'auth':
        return {
          cacheKey: '_preset_auth',
          useCache: true,
          enableAuth: true,
          enableErrorHandling: true,
          withCredentials: true,
        };
      
      case 'admin':
        return {
          cacheKey: '_preset_admin',
          useCache: true,
          enableAuth: true,
          enableLogging: true,
          enableErrorHandling: true,
          withCredentials: true,
          headers: {
            'X-Admin-Request': 'true',
          },
        };
      
      case 'public':
        return {
          cacheKey: '_preset_public',
          useCache: true,
          enableRetry: true,
          enableErrorHandling: true,
          withCredentials: false,
          timeout: 10000,
        };
      
      case 'upload':
        return {
          cacheKey: '_preset_upload',
          useCache: false, // アップロードはキャッシュしない
          enableAuth: true,
          enableErrorHandling: true,
          withCredentials: true,
          timeout: 120000, // 2分
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        };
      
      case 'batch':
        return {
          cacheKey: '_preset_batch',
          useCache: false,
          enableAuth: true,
          enableRetry: true,
          enableErrorHandling: true,
          withCredentials: true,
          timeout: 300000, // 5分
          maxRetries: 5,
          retryDelay: 2000,
        };
      
      case 'realtime':
        return {
          cacheKey: '_preset_realtime',
          useCache: true,
          enableAuth: true,
          enableErrorHandling: true,
          withCredentials: true,
          timeout: 5000, // 5秒
          enableRetry: false, // リアルタイムではリトライなし
        };
      
      case 'default':
      default:
        return {
          cacheKey: '_preset_default',
          useCache: true,
          enableAuth: true,
          enableRetry: true,
          enableErrorHandling: true,
          withCredentials: true,
        };
    }
  }
  
  /**
   * プリセットベースでクライアントを作成
   * @param preset プリセットタイプ
   * @param additionalConfig 追加設定
   * @returns Axiosインスタンス
   */
  createPresetClient(preset: ApiClientPresetType, additionalConfig?: Partial<UnifiedApiConfig>): AxiosInstance {
    return this.createClient({
      preset,
      ...additionalConfig,
    });
  }
  
  /**
   * デバッグ情報を取得
   * @returns デバッグ情報
   */
  getDebugInfo() {
    return {
      cacheStats: this.cache.getStats(),
      cacheSize: this.cache.size,
      defaultClientExists: !!this.defaultClient,
    };
  }
}

// シングルトンインスタンスのエクスポート
export const unifiedApiFactory = UnifiedApiFactory.getInstance();

// 便利な関数のエクスポート
export const createUnifiedClient = (config?: UnifiedApiConfig) => 
  unifiedApiFactory.createClient(config);
export const getDefaultApiClient = () => 
  unifiedApiFactory.createDefaultClient();
export const getAuthenticatedApiClient = (token?: string) => 
  unifiedApiFactory.createAuthenticatedClient(token);
export const getAdminApiClient = () => 
  unifiedApiFactory.createAdminClient();
export const getVersionedApiClient = (version: string) => 
  unifiedApiFactory.createVersionedClient(version);
export const getEnvironmentApiClient = (env: 'development' | 'staging' | 'production') => 
  unifiedApiFactory.createEnvironmentClient(env);
export const clearApiCache = () => 
  unifiedApiFactory.clearCache();

// プリセットベースのクライアント作成関数
export const createPresetApiClient = (preset: ApiClientPresetType, config?: Partial<UnifiedApiConfig>) =>
  unifiedApiFactory.createPresetClient(preset, config);
export const getPublicApiClient = () =>
  unifiedApiFactory.createPresetClient('public');
export const getUploadApiClient = () =>
  unifiedApiFactory.createPresetClient('upload');
export const getBatchApiClient = () =>
  unifiedApiFactory.createPresetClient('batch');
export const getRealtimeApiClient = () =>
  unifiedApiFactory.createPresetClient('realtime');

// デフォルトエクスポート
export default unifiedApiFactory;