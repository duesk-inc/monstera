import { getAuthClient } from './index';
import { handleApiError } from './error';
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
 * デフォルトロール更新
 * @param defaultRole デフォルトロール（1:super_admin, 2:admin, 3:manager, 4:employee）
 * @returns Promise<void>
 */
export const updateDefaultRole = async (defaultRole: number | null): Promise<void> => {
  const client = getAuthClient();
  
  try {
    DebugLogger.apiRequest({
      category: 'ユーザー',
      operation: '更新'
    }, {
      method: 'PUT',
      url: '/users/default-role',
      body: { default_role: defaultRole }
    });
    
    const response = await client.put('/users/default-role', {
      default_role: defaultRole
    });
    
    DebugLogger.apiSuccess({
      category: 'ユーザー',
      operation: '更新'
    }, {
      response: response.data,
      message: 'デフォルトロールを更新しました'
    });
  } catch (error) {
    DebugLogger.apiError({
      category: 'ユーザー',
      operation: '更新'
    }, {
      error
    });
    
    throw handleApiError(error, 'デフォルトロール更新');
  }
};

/**
 * ユーザー一覧取得
 * @param params 検索パラメータ
 * @returns ユーザー一覧
 */
export const getUsers = async (params?: GetUsersParams): Promise<GetUsersResponse> => {
  const client = getAuthClient();
  
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
  } catch (error) {
    DebugLogger.apiError({
      category: 'ユーザー',
      operation: '一覧取得'
    }, {
      error
    });
    
    throw handleApiError(error, 'ユーザー一覧取得');
  }
};

/**
 * ユーザーAPI
 */
export const userApi = {
  getUsers,
  updateDefaultRole,
};