// Migrated to new API client system
import { createPresetApiClient } from '@/lib/api';

// 管理者APIクライアント（adminプリセット使用）
const adminClient = createPresetApiClient('admin');

// 管理者APIのベースパス（新システムではプリセットで自動付与されるため簡略化）
const ADMIN_BASE_PATH = '/admin';

// APIエラークラス
export class ApiError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// エラーハンドリングのヘルパー関数
export const handleApiError = (error: any): never => {
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.message || 'エラーが発生しました';
    const code = data?.code || 'UNKNOWN_ERROR';
    
    throw new ApiError(message, status, code);
  } else if (error.request) {
    throw new ApiError('ネットワークエラーが発生しました', 0, 'NETWORK_ERROR');
  } else {
    throw new ApiError('予期しないエラーが発生しました', 0, 'UNEXPECTED_ERROR');
  }
};

// 共通のGETリクエスト
export const adminGet = async <T>(path: string, params?: any): Promise<T> => {
  try {
    const response = await adminClient.get(`${ADMIN_BASE_PATH}${path}`, { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// 共通のPOSTリクエスト
export const adminPost = async <T>(path: string, data?: any): Promise<T> => {
  try {
    const response = await adminClient.post(`${ADMIN_BASE_PATH}${path}`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// 共通のPUTリクエスト
export const adminPut = async <T>(path: string, data?: any): Promise<T> => {
  try {
    const response = await adminClient.put(`${ADMIN_BASE_PATH}${path}`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// 共通のDELETEリクエスト
export const adminDelete = async <T>(path: string): Promise<T> => {
  try {
    const response = await adminClient.delete(`${ADMIN_BASE_PATH}${path}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ファイルダウンロード用のリクエスト
export const adminDownload = async (path: string, filename: string, params?: any): Promise<void> => {
  try {
    const response = await adminClient.get(`${ADMIN_BASE_PATH}${path}`, {
      params,
      responseType: 'blob',
    });

    // ブラウザでダウンロード
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    handleApiError(error);
  }
};

// adminApiオブジェクトをexport
export const adminApi = {
  get: adminGet,
  post: adminPost,
  put: adminPut,
  delete: adminDelete,
  download: adminDownload,
};

// 個別のAPIモジュールをre-export
export * from './client';
export * from './dashboard';
export * from './engineer';
export * from './followUp';
export * from './invoice';
export * from './sales';
export * from './weeklyReport';
export * from './alert';

