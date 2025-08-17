import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

/**
 * APIクライアント設定インターフェース
 */
export interface ApiClientConfig {
  baseURL?: string;
  host?: string;
  version?: string;
  timeout?: number;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  enableLogging?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * APIクライアントファクトリインターフェース
 */
export interface ApiClientFactory {
  createClient(config?: ApiClientConfig): AxiosInstance;
  getDefaultClient(): AxiosInstance;
  getVersionedClient(version: string): AxiosInstance;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: ApiClientConfig = {
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  enableLogging: process.env.NODE_ENV === 'development',
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * APIクライアントファクトリ実装
 */
class ApiClientFactoryImpl implements ApiClientFactory {
  private static instance: ApiClientFactoryImpl;
  private clients: Map<string, AxiosInstance> = new Map();
  private defaultClient: AxiosInstance | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): ApiClientFactoryImpl {
    if (!ApiClientFactoryImpl.instance) {
      ApiClientFactoryImpl.instance = new ApiClientFactoryImpl();
    }
    return ApiClientFactoryImpl.instance;
  }

  /**
   * APIクライアントを作成
   */
  createClient(config: ApiClientConfig = {}): AxiosInstance {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    // baseURLの構築
    let baseURL = mergedConfig.baseURL;
    if (!baseURL && mergedConfig.host && mergedConfig.version) {
      baseURL = `${mergedConfig.host}/api/${mergedConfig.version}`;
    } else if (!baseURL) {
      // 環境変数から取得（互換性維持）
      const host = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080';
      const version = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
      const legacyUrl = process.env.NEXT_PUBLIC_API_URL;
      baseURL = legacyUrl || `${host}/api/${version}`;
    }

    // Axiosインスタンスを作成
    const client = axios.create({
      baseURL,
      timeout: mergedConfig.timeout,
      withCredentials: mergedConfig.withCredentials,
      headers: mergedConfig.headers,
    });

    // リクエストインターセプター
    this.setupRequestInterceptors(client, mergedConfig);

    // レスポンスインターセプター
    this.setupResponseInterceptors(client, mergedConfig);

    return client;
  }

  /**
   * デフォルトクライアントを取得
   */
  getDefaultClient(): AxiosInstance {
    if (!this.defaultClient) {
      this.defaultClient = this.createClient();
    }
    return this.defaultClient;
  }

  /**
   * バージョン指定クライアントを取得
   */
  getVersionedClient(version: string): AxiosInstance {
    const cacheKey = `version_${version}`;
    
    if (!this.clients.has(cacheKey)) {
      const host = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080';
      const client = this.createClient({
        host,
        version,
      });
      this.clients.set(cacheKey, client);
    }

    return this.clients.get(cacheKey)!;
  }

  /**
   * 環境別クライアントを取得
   */
  getEnvironmentClient(environment: 'development' | 'staging' | 'production'): AxiosInstance {
    const cacheKey = `env_${environment}`;
    
    if (!this.clients.has(cacheKey)) {
      let host: string;
      switch (environment) {
        case 'development':
          host = 'http://localhost:8080';
          break;
        case 'staging':
          host = process.env.NEXT_PUBLIC_STAGING_API_HOST || 'https://staging-api.monstera.com';
          break;
        case 'production':
          host = process.env.NEXT_PUBLIC_PRODUCTION_API_HOST || 'https://api.monstera.com';
          break;
      }

      const client = this.createClient({
        host,
        version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
      });
      this.clients.set(cacheKey, client);
    }

    return this.clients.get(cacheKey)!;
  }

  /**
   * 認証付きクライアントを取得
   */
  getAuthenticatedClient(token?: string): AxiosInstance {
    const cacheKey = token ? `auth_${token}` : 'auth_default';
    
    if (!this.clients.has(cacheKey)) {
      const client = this.createClient();
      
      // 認証ヘッダーの追加
      if (token) {
        client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      this.clients.set(cacheKey, client);
    }

    return this.clients.get(cacheKey)!;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.clients.clear();
    this.defaultClient = null;
  }

  /**
   * リクエストインターセプターのセットアップ
   */
  private setupRequestInterceptors(client: AxiosInstance, config: ApiClientConfig): void {
    // ロギング
    if (config.enableLogging) {
      client.interceptors.request.use(
        (request) => {
          console.log(`[API Request] ${request.method?.toUpperCase()} ${request.url}`);
          if (request.data) {
            console.log('[API Request Body]', request.data);
          }
          return request;
        },
        (error) => {
          console.error('[API Request Error]', error);
          return Promise.reject(error);
        }
      );
    }

    // タイムスタンプの追加（パフォーマンス測定用）
    client.interceptors.request.use((request) => {
      (request as any).metadata = {
        startTime: Date.now(),
      };
      return request;
    });
  }

  /**
   * レスポンスインターセプターのセットアップ
   */
  private setupResponseInterceptors(client: AxiosInstance, config: ApiClientConfig): void {
    // ロギングとパフォーマンス測定
    if (config.enableLogging) {
      client.interceptors.response.use(
        (response) => {
          const duration = Date.now() - (response.config as any).metadata?.startTime;
          console.log(
            `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`
          );
          return response;
        },
        (error) => {
          if (error.response) {
            const duration = Date.now() - (error.config as any).metadata?.startTime;
            console.error(
              `[API Error] ${error.config.method?.toUpperCase()} ${error.config.url} - ${error.response.status} (${duration}ms)`,
              error.response.data
            );
          } else {
            console.error('[API Error]', error.message);
          }
          return Promise.reject(error);
        }
      );
    }

    // リトライロジック
    if (config.enableRetry) {
      client.interceptors.response.use(
        undefined,
        async (error: AxiosError) => {
          const originalRequest = error.config as AxiosRequestConfig & { _retry?: number };
          
          // リトライ対象のエラーかチェック
          if (
            error.response &&
            [502, 503, 504].includes(error.response.status) &&
            originalRequest &&
            !originalRequest._retry
          ) {
            originalRequest._retry = (originalRequest._retry || 0) + 1;
            
            if (originalRequest._retry <= (config.maxRetries || 3)) {
              // 指数バックオフでリトライ
              const delay = (config.retryDelay || 1000) * Math.pow(2, originalRequest._retry - 1);
              await new Promise(resolve => setTimeout(resolve, delay));
              
              console.log(`[API Retry] Attempt ${originalRequest._retry} for ${originalRequest.url}`);
              return client(originalRequest);
            }
          }
          
          return Promise.reject(error);
        }
      );
    }

    // エラーハンドリング
    client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // 401エラーの場合、ログイン画面へリダイレクト
        if (error.response?.status === 401) {
          // トークンが無効または期限切れ
          if (typeof window !== 'undefined') {
            // クライアントサイドでのみ実行
            const currentPath = window.location.pathname;
            if (!currentPath.startsWith('/auth/')) {
              // 認証ページ以外の場合はリダイレクト
              window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
            }
          }
        }

        // 429エラー（レート制限）の場合
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const message = retryAfter
            ? `APIレート制限に達しました。${retryAfter}秒後に再試行してください。`
            : 'APIレート制限に達しました。しばらく待ってから再試行してください。';
          
          console.warn('[API Rate Limit]', message);
          // カスタムエラーを投げる
          const customError = new Error(message);
          (customError as any).isRateLimit = true;
          (customError as any).retryAfter = retryAfter;
          throw customError;
        }

        return Promise.reject(error);
      }
    );
  }
}

// エクスポート用のファクトリインスタンス
const apiClientFactory = ApiClientFactoryImpl.getInstance();

// デフォルトクライアント（後方互換性のため）
export const apiClient = apiClientFactory.getDefaultClient();

// ファクトリとユーティリティ関数のエクスポート
export const createApiClient = (config?: ApiClientConfig) => apiClientFactory.createClient(config);
export const getVersionedApiClient = (version: string) => apiClientFactory.getVersionedClient(version);
export const getEnvironmentApiClient = (env: 'development' | 'staging' | 'production') => 
  apiClientFactory.getEnvironmentClient(env);
export const getAuthenticatedApiClient = (token?: string) => apiClientFactory.getAuthenticatedClient(token);
export const clearApiClientCache = () => apiClientFactory.clearCache();

// デフォルトエクスポート
export default apiClient;