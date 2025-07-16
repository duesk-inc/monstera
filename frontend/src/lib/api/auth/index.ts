/**
 * 認証APIエクスポート - JWT認証
 */

import axios from 'axios';
import { API_BASE_URL } from '@/constants/api';
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenResponse,
  LogoutResponse,
  ErrorResponse
} from '@/types/auth';
import { 
  setAuthState,
  clearAuthState,
  removeUser
} from '@/utils/auth';
import { DebugLogger } from '@/lib/debug/logger';

// 認証エラーが発生したページのパスを保存するキー
const AUTH_ERROR_PAGE_KEY = 'auth_error_from_page';

/**
 * APIから取得したユーザー情報をローカルストレージに保存
 */
const setUser = (user: any): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

/**
 * JWTログイン処理
 * @param credentials ログイン情報（メールアドレスとパスワード）
 * @returns ログイン結果
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    DebugLogger.info({
      category: 'JWT認証',
      operation: 'ログイン開始'
    }, 'JWTログイン処理を開始', {
      email: credentials.email
    });

    // APIクライアントを作成（認証前なのでgetAuthClientは使わない）
    const client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // CORS リクエストでクッキーを送信
    });

    // ログインリクエスト
    const response = await client.post<LoginResponse>('/api/v1/auth/login', credentials);
    
    DebugLogger.info({
      category: 'JWT認証',
      operation: 'ログイン成功'
    }, 'JWTログインに成功', {
      hasAccessToken: !!response.data.access_token,
      hasUser: !!response.data.user
    });

    // 正常にレスポンスを受け取った場合
    if (response.data && response.data.access_token) {
      // 認証状態を保存
      setAuthState(true);
      
      // ユーザー情報をローカルストレージに保存
      if (response.data.user) {
        setUser(response.data.user);
      } else {
        DebugLogger.apiError({
          category: 'JWT認証',
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
      category: 'JWT認証',
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
 * JWTトークンリフレッシュ処理
 * @returns 新しいトークン情報
 */
export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  try {
    DebugLogger.info({
      category: 'JWT認証',
      operation: 'トークンリフレッシュ開始'
    }, 'JWTトークンリフレッシュ処理を開始');

    // APIクライアントを作成
    const client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // CORS リクエストでクッキーを送信
    });

    // リフレッシュトークンリクエスト（セキュアなクッキーはバックエンドで自動的に使用される）
    const response = await client.post<RefreshTokenResponse>('/api/v1/auth/refresh');
    
    DebugLogger.info({
      category: 'JWT認証',
      operation: 'トークンリフレッシュ成功'
    }, 'JWTトークンリフレッシュに成功', {
      hasAccessToken: !!response.data.access_token,
      hasUser: !!response.data.user
    });

    // 正常にレスポンスを受け取った場合
    if (response.data && response.data.access_token) {
      // 認証状態を保存
      setAuthState(true);
      
      // ユーザー情報が含まれていれば更新
      if (response.data.user) {
        setUser(response.data.user);
      }
    }
    
    return response.data;
  } catch (error) {
    DebugLogger.apiError({
      category: 'JWT認証',
      operation: 'トークンリフレッシュエラー'
    }, {
      error
    });

    // エラーハンドリング
    if (axios.isAxiosError(error) && error.response) {
      // 401エラーの場合はログアウト処理を実行
      if (error.response.status === 401) {
        // ログアウト処理（ユーザー情報とトークンをクリア）
        clearAuthState();
        removeUser();
        
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
 * JWTログアウト処理
 * @returns ログアウト結果
 */
export const logout = async (): Promise<LogoutResponse> => {
  try {
    DebugLogger.info({
      category: 'JWT認証',
      operation: 'ログアウト開始'
    }, 'JWTログアウト処理を開始');

    // セッションストレージのクリア
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(AUTH_ERROR_PAGE_KEY);
    }
    
    // APIクライアントを作成
    const client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });
    
    // ログアウトリクエスト
    const response = await client.post<LogoutResponse>('/api/v1/auth/logout');
    
    DebugLogger.info({
      category: 'JWT認証',
      operation: 'ログアウト成功'
    }, 'JWTログアウトに成功');

    // ローカルストレージからユーザー情報を削除
    removeUser();
    clearAuthState();
    
    return response.data;
  } catch (error) {
    DebugLogger.apiError({
      category: 'JWT認証',
      operation: 'ログアウトエラー'
    }, {
      error
    });

    // エラーがあってもローカルのトークンとユーザー情報は削除
    removeUser();
    clearAuthState();
    
    // セッションストレージもクリア
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
      category: 'JWT認証',
      operation: 'ユーザー情報取得開始'
    }, 'JWT現在のユーザー情報取得を開始');

    // APIクライアントを作成
    const client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });
    
    // 現在のユーザー情報を取得
    const response = await client.get('/api/v1/auth/me');
    
    DebugLogger.info({
      category: 'JWT認証',
      operation: 'ユーザー情報取得成功'
    }, 'JWT現在のユーザー情報取得に成功', {
      hasUser: !!response.data.user
    });

    return response.data;
  } catch (error) {
    DebugLogger.apiError({
      category: 'JWT認証',
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