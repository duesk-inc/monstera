import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig, AxiosInstance, AxiosRequestConfig } from 'axios';
// Cookie認証に移行したため、以下のimportは不要になりました
// import { setAuthState, clearAuthState, getAccessToken, clearAllAuthData } from '@/utils/auth';
import { refreshToken } from '@/lib/api/auth';
import { API_TIMEOUTS, TIME_THRESHOLDS, UI_DELAYS } from '@/constants/delays';
import { AUTH_STORAGE_KEYS } from '@/constants/storage';
import { apiClient as factoryClient, createApiClient } from '@/lib/api/client';

// API基本設定（後方互換性のため維持）
// 新しい分離された環境変数を使用（後方互換性も維持）
const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
const LEGACY_URL = process.env.NEXT_PUBLIC_API_URL;

export const API_BASE_URL = LEGACY_URL || `${API_HOST}/api/${API_VERSION}`;

// 認証エラーが発生したページのパスを保存するキー
const AUTH_ERROR_PAGE_KEY = AUTH_STORAGE_KEYS.AUTH_ERROR_PAGE;
// リダイレクト処理中フラグ（メモリ内状態）
let isRedirectInProgress = false;
// 最後の認証エラー表示時刻を保存するキー
const LAST_AUTH_ERROR_TIME_KEY = AUTH_STORAGE_KEYS.LAST_AUTH_ERROR_TIME;
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

// APIクライアントの設定（ファクトリから取得）
export const api = factoryClient;

interface ApiClientOptions extends AxiosRequestConfig {
  signal?: AbortSignal;
  timeout?: number;
}

const DEFAULT_TIMEOUT = API_TIMEOUTS.DEFAULT;

// 認証済みAPIクライアントを取得（ファクトリから取得済みのインスタンスを返す）
export const getAuthClient = (): AxiosInstance => {
  // ファクトリから取得済みのキャッシュされたインスタンスを返す
  // これにより、毎回新しいインスタンスを作成する問題を解決
  return api;
};

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
  const client = getAuthClient();
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
  } catch (error) {
    if (error.name === 'CanceledError' || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new DOMException('Request was aborted', 'AbortError');
    }
    throw error;
  }
};

// Export apiClient as an alias for api (for backward compatibility)
export const apiClient = api; 