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
    // Blobとして返るエラー（CSV要求時のJSONエンベロープ）に対応
    const anyErr: any = error as any;
    const resp = anyErr?.response;
    if (resp && resp.data instanceof Blob) {
      try {
        const text = await resp.data.text();
        const json = JSON.parse(text);
        const code = json?.code || 'UNKNOWN_ERROR';
        const message = json?.message || 'エラーが発生しました';
        throw new ApiError(message, resp.status || 400, code);
      } catch (_) {
        // JSONでなければ従来のハンドラに委譲
      }
    }
    handleApiError(anyErr);
    throw anyErr as any;
  }
};

// 共通のPOSTリクエスト
export const adminPost = async <T>(path: string, data?: any): Promise<T> => {
  try {
    const response = await adminClient.post(`${ADMIN_BASE_PATH}${path}`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error as any;
  }
};

// 共通のPUTリクエスト
export const adminPut = async <T>(path: string, data?: any): Promise<T> => {
  try {
    const response = await adminClient.put(`${ADMIN_BASE_PATH}${path}`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error as any;
  }
};

// 共通のDELETEリクエスト
export const adminDelete = async <T>(path: string): Promise<T> => {
  try {
    const response = await adminClient.delete(`${ADMIN_BASE_PATH}${path}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error as any;
  }
};

// ファイルダウンロード用のリクエスト
export const adminDownload = async (
  path: string,
  filename?: string,
  dataOrParams?: any,
  method: 'GET' | 'POST' = 'GET',
  options?: { accept?: string; addBOM?: boolean }
): Promise<void> => {
  try {
    const accept = options?.accept || 'text/csv,application/csv,text/plain,application/octet-stream';
    const config: any = {
      responseType: 'blob',
      headers: { Accept: accept },
    };

    let response;
    if (method === 'POST') {
      response = await adminClient.post(`${ADMIN_BASE_PATH}${path}`, dataOrParams, config);
    } else {
      response = await adminClient.get(`${ADMIN_BASE_PATH}${path}`, { ...config, params: dataOrParams });
    }

    // ファイル名をContent-Dispositionから取得（優先）
    let resolvedFilename = filename || 'download';
    const dispo = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
    if (dispo) {
      // RFC 5987 filename* or plain filename
      const matchStar = /filename\*=(?:UTF-8''|utf-8'')?([^;\n]+)/i.exec(dispo);
      const matchPlain = /filename="?([^";\n]+)"?/i.exec(dispo);
      if (matchStar && matchStar[1]) {
        try { resolvedFilename = decodeURIComponent(matchStar[1]); } catch { resolvedFilename = matchStar[1]; }
      } else if (matchPlain && matchPlain[1]) {
        resolvedFilename = matchPlain[1];
      }
    }

    // CSVのBOM付与（必要に応じて）
    const contentType = (response.headers?.['content-type'] || '').toLowerCase();
    const isCsv = contentType.includes('text/csv') || contentType.includes('application/csv');
    const addBOM = options?.addBOM ?? isCsv; // 既定: CSVならBOM付与
    const blob = addBOM
      ? new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), response.data], { type: contentType || 'text/csv;charset=utf-8' })
      : new Blob([response.data], { type: contentType || 'application/octet-stream' });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', resolvedFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    handleApiError(error);
    throw error as any;
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
