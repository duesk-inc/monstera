import { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '@/lib/api/admin';

// Axiosのエラーインターセプター設定
export const setupErrorInterceptor = (axiosInstance: AxiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // レスポンスがある場合
      if (error.response) {
        const { status, data } = error.response;
        const errorData = data as any;
        
        // APIエラーとして処理
        const message = errorData?.message || errorData?.error || getDefaultErrorMessage(status);
        const code = errorData?.code || getDefaultErrorCode(status);
        
        throw new ApiError(message, status, code);
      }
      
      // ネットワークエラーやタイムアウト
      if (error.code === 'ECONNABORTED') {
        throw new ApiError('リクエストがタイムアウトしました', 0, 'TIMEOUT');
      }
      
      if (error.code === 'ERR_NETWORK') {
        throw new ApiError('ネットワークに接続できません', 0, 'NETWORK_ERROR');
      }
      
      // その他のエラー
      throw new ApiError('予期しないエラーが発生しました', 0, 'UNKNOWN_ERROR');
    }
  );
};

// デフォルトのエラーメッセージ
const getDefaultErrorMessage = (status: number): string => {
  switch (status) {
    case 400:
      return 'リクエストが不正です';
    case 401:
      return '認証が必要です';
    case 403:
      return 'アクセスが拒否されました';
    case 404:
      return 'リソースが見つかりません';
    case 422:
      return '入力内容に誤りがあります';
    case 429:
      return 'リクエストが多すぎます。しばらくお待ちください';
    case 500:
      return 'サーバーエラーが発生しました';
    case 502:
      return 'ゲートウェイエラーが発生しました';
    case 503:
      return 'サービスが一時的に利用できません';
    default:
      return `エラーが発生しました (${status})`;
  }
};

// デフォルトのエラーコード
const getDefaultErrorCode = (status: number): string => {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'TOO_MANY_REQUESTS';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'HTTP_ERROR';
  }
};