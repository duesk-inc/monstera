// Migrated to new API client system
import { createPresetApiClient } from '@/lib/api';
import { handleApiError } from '@/lib/api/error/handler';
import { DebugLogger } from '@/lib/debug/logger';

/**
 * ユーザー検索パラメータ
 */
export interface GetUsersParams {
  roles?: string[];
  limit?: number;
  page?: number;
  keyword?: string;
}

/**
 * ユーザー情報
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
}

/**
 * ユーザー一覧レスポンス
 */
export interface GetUsersResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

/**
 * デフォルトロール更新リクエスト
 */
export interface UpdateDefaultRoleRequest {
  default_role: number | null;
}


/**
 * ユーザー一覧取得
 * @param params 検索パラメータ
 * @returns ユーザー一覧
 */
export const getUsers = async (params?: GetUsersParams): Promise<GetUsersResponse> => {
  const client = createPresetApiClient('auth');
  
  try {
    DebugLogger.apiRequest({
      category: 'ユーザー',
      operation: '一覧取得'
    }, {
      method: 'GET',
      url: '/users',
      params
    });
    
    const response = await client.get('/users', { params });
    
    DebugLogger.apiSuccess({
      category: 'ユーザー',
      operation: '一覧取得'
    }, {
      response: response.data,
      message: `${response.data.items.length}件のユーザーを取得しました`
    });
    
    return response.data;
  } catch (error: any) {
    // エラーハンドリングはグローバルハンドラーに委譲
    const standardError = handleApiError(error, {
      showNotification: true,
      logError: true,
      throwError: false,
    });
    
    throw standardError;
  }
};

/**
 * ユーザーAPI
 */
export const userApi = {
  getUsers,
};