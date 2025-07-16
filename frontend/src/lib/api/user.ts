import { getAuthClient } from './index';
import { handleApiError } from './error';
import { DebugLogger } from '@/lib/debug/logger';

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