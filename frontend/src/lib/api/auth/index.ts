/**
 * * 認証APIエクスポート
 */

import axios from 'axios';
import { createPresetApiClient } from '@/lib/api/factory';
import { API_BASE_URL } from '@/constants/api';
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenResponse,
  LogoutResponse,
  ErrorResponse
} from '@/types/auth';
import { DebugLogger } from '@/lib/debug/logger';

// 認証エラーが発生したページのパスを保存するキー
const AUTH_ERROR_PAGE_KEY = 'auth_error_from_page';


/**
 * ログイン処理
 * @param credentials ログイン情報（メールアドレスとパスワード）
 * @returns ログイン結果
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    DebugLogger.info({
      category: '認証',
      operation: 'ログイン開始'
    }, 'ログイン処理を開始', {
      email: credentials.email
    });

    // APIクライアントを作成（認証前なのでgetAuthClientは使わない）
    const client = createPresetApiClient('auth', {
      baseURL: API_BASE_URL,
    });

    // ログインリクエスト
    const response = await client.post<LoginResponse>('/api/v1/auth/login', credentials);
    
    DebugLogger.info({
      category: '認証',
      operation: 'ログイン成功'
    }, 'ログインに成功', {
      hasAccessToken: !!response.data.access_token,
      hasUser: !!response.data.user
    });

    // 正常にレスポンスを受け取った場合
    if (response.data && response.data.access_token) {
      // ユーザー情報の確認
      if (!response.data.user) {
        DebugLogger.apiError({
          category: '認証',
          operation: 'ログイン'
        }, {
          error: new Error('ユーザー情報がレスポンスに含まれていません')
        });
      }
      
      // 認証エラーが発生したページがあれば、リダイレクト先として設定
      if (typeof window !== 'undefined') {
        const savedPath = sessionStorage.getItem(AUTH_ERROR_PAGE_KEY);
        if (savedPath && savedPath !== '/login' && savedPath !== '/dashboard') {
          response.data.redirect_to = savedPath;
          sessionStorage.removeItem(AUTH_ERROR_PAGE_KEY);
        }
      }
    }
    
    return response.data;
  } catch (error) {
    DebugLogger.apiError({
      category: '認証',
      operation: 'ログインエラー'
    }, {
      error,
      email: credentials.email
    });

    // エラーハンドリング
    if (axios.isAxiosError(error) && error.response) {
      const errorData = error.response.data as ErrorResponse;
      throw {
        error: errorData.error || 'ログインに失敗しました',
        status: error.response.status
      };
    }
    
    throw {
      error: 'ネットワークエラーが発生しました',
      status: 500
    };
  }
};

/**
 * トークンリフレッシュ処理
 * @returns 新しいトークン情報
 */
export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  try {
    DebugLogger.info({
      category: '認証',
      operation: 'トークンリフレッシュ開始'
    }, 'トークンリフレッシュ処理を開始');

    // APIクライアントを作成
    const client = createPresetApiClient('auth', {
      baseURL: API_BASE_URL,
    });

    // リフレッシュトークンリクエスト（セキュアなクッキーはバックエンドで自動的に使用される）
    const response = await client.post<RefreshTokenResponse>('/api/v1/auth/refresh');
    
    DebugLogger.info({
      category: '認証',
      operation: 'トークンリフレッシュ成功'
    }, 'トークンリフレッシュに成功', {
      hasAccessToken: !!response.data.access_token,
      hasUser: !!response.data.user
    });

    // 正常にレスポンスを受け取った場合（トークンはCookieで管理）
    if (!response.data || !response.data.access_token) {
      throw new Error('トークンリフレッシュレスポンスが不正です');
    }
    
    return response.data;
  } catch (error) {
    DebugLogger.apiError({
      category: '認証',
      operation: 'トークンリフレッシュエラー'
    }, {
      error
    });

    // エラーハンドリング
    if (axios.isAxiosError(error) && error.response) {
      // 401エラーの場合は現在のパスを保存
      if (error.response.status === 401) {
        // 現在のパスを保存
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          sessionStorage.setItem(AUTH_ERROR_PAGE_KEY, window.location.pathname);
        }
      }
      
      const errorData = error.response.data as ErrorResponse;
      throw {
        error: errorData.error || 'トークンの更新に失敗しました',
        status: error.response.status
      };
    }
    
    throw {
      error: 'ネットワークエラーが発生しました',
      status: 500
    };
  }
};

/**
 * ログアウト処理
 * @returns ログアウト結果
 */
export const logout = async (): Promise<LogoutResponse> => {
  try {
    DebugLogger.info({
      category: '認証',
      operation: 'ログアウト開始'
    }, 'ログアウト処理を開始');

    // セッションストレージのクリア
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(AUTH_ERROR_PAGE_KEY);
    }
    
    // APIクライアントを作成
    const client = createPresetApiClient('auth', {
      baseURL: API_BASE_URL,
    });
    
    // ログアウトリクエスト
    const response = await client.post<LogoutResponse>('/api/v1/auth/logout');
    
    DebugLogger.info({
      category: '認証',
      operation: 'ログアウト成功'
    }, 'ログアウトに成功');

    // ログアウト成功（サーバー側でセッションとCookieがクリアされる）
    
    return response.data;
  } catch (error) {
    DebugLogger.apiError({
      category: '認証',
      operation: 'ログアウトエラー'
    }, {
      error
    });

    // エラーがあってもセッションストレージはクリア
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(AUTH_ERROR_PAGE_KEY);
    }
    
    // エラーハンドリング
    if (axios.isAxiosError(error) && error.response) {
      const errorData = error.response.data as ErrorResponse;
      throw {
        error: errorData.error || 'ログアウトに失敗しました',
        status: error.response.status
      };
    }
    
    throw {
      error: 'ネットワークエラーが発生しました',
      status: 500
    };
  }
};

/**
 * 現在のユーザー情報を取得
 * @returns 現在のユーザー情報
 */
export const getCurrentUser = async () => {
  try {
    DebugLogger.info({
      category: '認証',
      operation: 'ユーザー情報取得開始'
    }, '現在のユーザー情報取得を開始');

    // APIクライアントを作成
    const client = createPresetApiClient('auth', {
      baseURL: API_BASE_URL,
    });
    
    // 現在のユーザー情報を取得
    const response = await client.get('/api/v1/auth/me');
    
    DebugLogger.info({
      category: '認証',
      operation: 'ユーザー情報取得成功'
    }, '現在のユーザー情報取得に成功', {
      hasUser: !!response.data.user
    });

    return response.data;
  } catch (error) {
    DebugLogger.apiError({
      category: '認証',
      operation: 'ユーザー情報取得エラー'
    }, {
      error
    });

    // エラーハンドリング
    if (axios.isAxiosError(error) && error.response) {
      const errorData = error.response.data as ErrorResponse;
      throw {
        error: errorData.error || 'ユーザー情報の取得に失敗しました',
        status: error.response.status
      };
    }
    
    throw {
      error: 'ネットワークエラーが発生しました',
      status: 500
    };
  }
};