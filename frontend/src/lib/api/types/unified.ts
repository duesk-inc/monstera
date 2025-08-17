/**
 * 統一API型定義
 * ジェネリクスを使用した型安全なAPI操作
 */

import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiClientPresetType } from '@/lib/api/factory';

/**
 * APIレスポンスの基本型
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  timestamp?: string;
}

/**
 * APIエラーレスポンスの基本型
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  status: number;
  timestamp?: string;
}

/**
 * ページネーションメタデータ
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * ページネーション付きレスポンス
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * APIリクエスト設定の拡張型
 */
export interface ExtendedApiConfig extends AxiosRequestConfig {
  preset?: ApiClientPresetType;
  skipAuth?: boolean;
  skipCache?: boolean;
  retryCount?: number;
  useAbortController?: boolean;
}

/**
 * 型安全なAPIクライアントインターフェース
 */
export interface TypedApiClient extends AxiosInstance {
  get<T = any>(url: string, config?: ExtendedApiConfig): Promise<AxiosResponse<T>>;
  post<T = any>(url: string, data?: any, config?: ExtendedApiConfig): Promise<AxiosResponse<T>>;
  put<T = any>(url: string, data?: any, config?: ExtendedApiConfig): Promise<AxiosResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: ExtendedApiConfig): Promise<AxiosResponse<T>>;
  delete<T = any>(url: string, config?: ExtendedApiConfig): Promise<AxiosResponse<T>>;
}

/**
 * APIメソッドの型定義
 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * APIエンドポイント定義
 */
export interface ApiEndpoint<TRequest = any, TResponse = any> {
  method: ApiMethod;
  path: string;
  preset?: ApiClientPresetType;
  requestType?: TRequest;
  responseType?: TResponse;
  requiresAuth?: boolean;
  description?: string;
}

/**
 * APIエンドポイントコレクション
 */
export type ApiEndpoints<T extends Record<string, ApiEndpoint>> = T;

/**
 * 型安全なAPIリクエスト関数
 */
export type TypedApiRequest<TRequest, TResponse> = (
  data?: TRequest,
  config?: ExtendedApiConfig
) => Promise<ApiResponse<TResponse>>;

/**
 * APIフック用の戻り値型
 */
export interface ApiHookResult<T> {
  data: T | null;
  error: ApiErrorResponse | null;
  loading: boolean;
  refetch: () => Promise<void>;
  cancel: () => void;
}

/**
 * バッチAPIリクエスト
 */
export interface BatchApiRequest {
  id: string;
  endpoint: ApiEndpoint;
  data?: any;
  config?: ExtendedApiConfig;
}

/**
 * バッチAPIレスポンス
 */
export interface BatchApiResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
}

/**
 * APIキャッシュエントリ
 */
export interface ApiCacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

/**
 * API設定の型ガード
 */
export function isApiErrorResponse(response: any): response is ApiErrorResponse {
  return response && 
    typeof response === 'object' &&
    'error' in response &&
    typeof response.error === 'object' &&
    'code' in response.error &&
    'message' in response.error;
}

/**
 * ページネーションレスポンスの型ガード
 */
export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return response &&
    typeof response === 'object' &&
    Array.isArray(response.data) &&
    'meta' in response &&
    typeof response.meta === 'object' &&
    'total' in response.meta &&
    'page' in response.meta;
}

/**
 * APIレスポンスのラッパー型
 */
export type SafeApiResponse<T> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: ApiErrorResponse };

/**
 * 型安全なAPIレスポンスハンドラー
 */
export async function handleApiResponse<T>(
  promise: Promise<AxiosResponse<T>>
): Promise<SafeApiResponse<T>> {
  try {
    const response = await promise;
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    if (isApiErrorResponse(error.response?.data)) {
      return {
        success: false,
        error: error.response.data,
      };
    }
    
    // デフォルトエラーレスポンス
    return {
      success: false,
      error: {
        error: {
          code: 'UNKNOWN_ERROR',
          message: error.message || 'An unknown error occurred',
          details: { originalError: error },
        },
        status: error.response?.status || 500,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * プリセット設定の型マップ
 */
export interface PresetConfigMap {
  default: ExtendedApiConfig;
  auth: ExtendedApiConfig;
  admin: ExtendedApiConfig;
  public: ExtendedApiConfig;
  upload: ExtendedApiConfig;
  batch: ExtendedApiConfig;
  realtime: ExtendedApiConfig;
}

/**
 * 型安全なプリセット取得
 */
export function getTypedPresetConfig<K extends keyof PresetConfigMap>(
  preset: K
): PresetConfigMap[K] {
  // 実際の設定はファクトリから取得
  // ここでは型定義のみ
  return {} as PresetConfigMap[K];
}