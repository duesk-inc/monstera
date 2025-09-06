import { AxiosError, AxiosResponse, InternalAxiosRequestConfig, AxiosRequestConfig } from 'axios';
// Cookie認証に移行したため、以下のimportは不要になりました
// import { setAuthState, clearAuthState, getAccessToken, clearAllAuthData } from '@/utils/auth';
import { refreshToken } from '@/lib/api/auth';
import { API_TIMEOUTS, TIME_THRESHOLDS, UI_DELAYS } from '@/constants/delays';
import { 
  apiClient as factoryClient,
  createApiClient,
  getDefaultApiClient,
  getAuthenticatedApiClient,
  getAdminApiClient,
  getVersionedApiClient,
  getEnvironmentApiClient,
  clearApiClientCache,
  apiClientFactory,
  type ApiClientConfig
} from '@/lib/api/client';
import { createPresetApiClient } from '@/lib/api/factory';
import { getApiEnvironment } from '@/lib/api/config/env';

// API基本設定（後方互換性のため維持）
const envConfig = getApiEnvironment();
export const API_BASE_URL = envConfig.baseUrl;

// 認証エラーが発生したページのパスを保存するキー
const AUTH_ERROR_PAGE_KEY = 'auth_error_from_page';
// リダイレクト処理中フラグ（メモリ内状態）
let isRedirectInProgress = false;
// 最後の認証エラー表示時刻を保存するキー
const LAST_AUTH_ERROR_TIME_KEY = 'last_auth_error_time';
// デバッグログを有効にするフラグ
const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * デバッグログ出力関数
 */
const debugLog = (...args: unknown[]) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

// APIクライアントの設定（非推奨: createPresetApiClientを使用してください）
export const api = factoryClient;

interface ApiClientOptions extends AxiosRequestConfig {
  signal?: AbortSignal;
  timeout?: number;
}

const DEFAULT_TIMEOUT = API_TIMEOUTS.DEFAULT;

/**
 * 認証エラー時の共通処理
 * @param error エラーオブジェクト
 */
const handleAuthError = (error: AxiosError) => {
  // すでにリダイレクト処理中の場合や、ログイン画面上での場合は何もしない
  if (isRedirectInProgress || 
     (typeof window !== 'undefined' && window.location.pathname.includes('/login'))) {
    return Promise.reject(error);
  }
  
  // 処理フラグを立てる
  isRedirectInProgress = true;
  
  if (typeof window !== 'undefined') {
    // Cookie認証なので、認証状態のクリアは不要（サーバー側で処理）
    // clearAuthState();
    
    // 現在のパスを保存（ダッシュボード画面でも保存する）
    const currentPath = window.location.pathname;
    // ログイン画面でなければパスを保存
    if (!currentPath.includes('/login')) {
      sessionStorage.setItem(AUTH_ERROR_PAGE_KEY, currentPath);
    }
    
    // 最後にエラーメッセージを表示した時刻を取得
    const lastErrorTime = localStorage.getItem(LAST_AUTH_ERROR_TIME_KEY);
    const now = Date.now();
    
    // エラーメッセージを表示するかどうかの判定（3秒以内に表示済みならスキップ）
    let shouldShowMessage = true;
    
    if (lastErrorTime) {
      const timeDiff = now - parseInt(lastErrorTime, 10);
      if (timeDiff < TIME_THRESHOLDS.IMMEDIATE) {
        shouldShowMessage = false;
      }
    }
    
    // エラーメッセージを表示
    if (shouldShowMessage) {
      // 現在の時刻を保存
      localStorage.setItem(LAST_AUTH_ERROR_TIME_KEY, now.toString());
      
      // イベント発火（1回だけ）
      const authErrorEvent = new CustomEvent('auth-error', {
        detail: { message: 'セッションの有効期限が切れました。再度ログインしてください。' }
      });
      window.dispatchEvent(authErrorEvent);
    }
    
    // 明示的にforceパラメータを付与してリダイレクト
    const loginUrl = '/login?force=true&ts=' + now;
    
    // 即時にログイン画面へリダイレクト - ブラウザ履歴を置き換えて戻れないようにする
    setTimeout(() => {
      // window.location.replaceを使用して履歴を上書き
      window.location.replace(loginUrl);
      
      // リダイレクト完了後にフラグをリセット
      setTimeout(() => {
        isRedirectInProgress = false;
      }, UI_DELAYS.THROTTLE);
    }, UI_DELAYS.DEBOUNCE);
  }
  
  return Promise.reject(error);
};

// 型拡張：リトライフラグを追加
interface ExtendedInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _isRetry?: boolean;
}

// 追加のインターセプター設定（認証関連）
// ファクトリで生成されたクライアントに追加の認証処理を設定
api.interceptors.request.use(
  (config) => {
    // 本番環境では Referer と Origin のチェックを追加
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      config.headers['X-CSRF-Protection'] = '1';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // 正常なレスポンスの場合（認証関連のレスポンスは特別な処理なし）
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedInternalAxiosRequestConfig;
    
    // originalRequestがない場合やすでに再試行済みの場合はエラーを返す
    if (!originalRequest || originalRequest._isRetry) {
      return Promise.reject(error);
    }
    
    // 401エラー（認証切れ）の場合 - リフレッシュトークンでリトライ
    if (error.response && error.response.status === 401 && !originalRequest.url?.includes('/auth/')) {
      debugLog('401エラー検出 - トークンリフレッシュ試行');
      
      try {
        // リフレッシュトークンを使って新しいトークンを取得
        await refreshToken();
        
        // 元のリクエストを再試行
        originalRequest._isRetry = true;
        
        return api(originalRequest);
      } catch {
        // リフレッシュトークンでの更新に失敗した場合は認証エラー処理
        return handleAuthError(error);
      }
    }
    
    return Promise.reject(error);
  }
);

// APIリクエストのラッパー関数
export const apiRequest = async <T>(
  method: string,
  url: string,
  options: ApiClientOptions = {}
): Promise<T> => {
  const client = createPresetApiClient('auth');
  const { signal, timeout = DEFAULT_TIMEOUT, ...rest } = options;

  try {
    const response = await client.request({
      method,
      url,
      signal,
      timeout,
      ...rest,
    });
    return response.data;
  } catch (error: unknown) {
    if ((typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'CanceledError') ||
        (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError')) {
      throw new DOMException('Request was aborted', 'AbortError');
    }
    throw error;
  }
};

// Export apiClient as an alias for api (for backward compatibility)
export const apiClient = api;

// ====================================
// 統一APIエクスポート（Phase 3更新）
// ====================================

/**
 * メインのAPIクライアント
 * すべてのAPIコールでこれを使用することを推奨
 */
export default apiClient;

// APIクライアントファクトリ関数（Phase 3で統合）
export { 
  createApiClient,
  getDefaultApiClient,
  getAuthenticatedApiClient,
  getAdminApiClient,
  getVersionedApiClient,
  getEnvironmentApiClient,
  clearApiClientCache,
  apiClientFactory,
  type ApiClientConfig
} from '@/lib/api/client';

// 新しい統合ファクトリ（Phase 3追加）
export {
  UnifiedApiFactory,
  unifiedApiFactory,
  createUnifiedClient,
  clearApiCache,
  type UnifiedApiConfig
} from '@/lib/api/factory';

// 環境変数関連
export { getApiEnvironment, validateApiEnvironment } from '@/lib/api/config/env';
export type { ApiEnvironmentConfig } from '@/lib/api/config/env';

// エラーハンドリング（レガシー）
export { isAbortError, AbortError } from '@/lib/api/error';

// 統一エラーハンドリング
export { 
  handleApiError, 
  handleApiErrorSilently, 
  handleRetryableApiError,
  globalApiErrorHandler,
  type ErrorHandlingOptions 
} from '@/lib/api/error/handler';

export {
  ApiErrorCode,
  type StandardErrorResponse,
  type ValidationErrorResponse,
  type ExtendedErrorInfo,
  type ErrorDetails,
  type ValidationErrorDetail,
  ErrorSeverity,
  createErrorResponse,
  createValidationErrorResponse,
  getErrorMessage,
  getErrorCodeFromStatus,
  getErrorSeverity,
  isStandardErrorResponse,
  isValidationErrorResponse,
} from '@/lib/api/types/error';

// API設定（config.tsから）
export { API_CONFIG, endpoints } from '@/lib/api/config';

// リトライ設定
export { isRetryableError, calculateRetryDelay, queryRetryConfig } from '@/lib/api/retry-config';

// 統一型定義
export type {
  ApiResponse,
  ApiErrorResponse,
  PaginatedResponse,
  PaginationMeta,
  ExtendedApiConfig,
  TypedApiClient,
  ApiMethod,
  ApiEndpoint,
  ApiEndpoints,
  TypedApiRequest,
  ApiHookResult,
  BatchApiRequest,
  BatchApiResponse,
  ApiCacheEntry,
  SafeApiResponse,
  PresetConfigMap,
} from '@/lib/api/types/unified';

export {
  isApiErrorResponse,
  isPaginatedResponse,
  handleApiResponse,
  getTypedPresetConfig,
} from '@/lib/api/types/unified';

// プリセットタイプ
export type { ApiClientPresetType } from '@/lib/api/factory';
export { createPresetApiClient, getPublicApiClient, getUploadApiClient, getBatchApiClient, getRealtimeApiClient } from '@/lib/api/factory';

/**
 * 推奨される使い方:
 * 
 * import apiClient from '@/lib/api';
 * 
 * または
 * 
 * import { apiClient, handleApiError } from '@/lib/api';
 * 
 * プリセットベース:
 * 
 * import { createPresetApiClient } from '@/lib/api';
 * const client = createPresetApiClient('auth');
 */ 
// @ts-nocheck
