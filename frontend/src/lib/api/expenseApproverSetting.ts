import { createPresetApiClient } from '@/lib/api';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import { DebugLogger } from '../debug/logger';

// 経費承認者設定API型定義
export interface ExpenseApproverSetting {
  id: string;
  approvalType: 'manager' | 'executive';
  approverId: string;
  approver?: {
    id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  priority: number;
  createdBy: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseApproverSettingsResponse {
  settings: ExpenseApproverSetting[];
}

export interface ExpenseApproverSettingHistory {
  id: string;
  settingId: string;
  approvalType: 'manager' | 'executive';
  approverId: string;
  action: 'create' | 'update' | 'delete';
  changedBy: string;
  changer?: {
    id: string;
    name: string;
    email: string;
  };
  changedAt: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
}

export interface ExpenseApproverSettingHistoriesResponse {
  histories: ExpenseApproverSettingHistory[];
  total: number;
}

export interface CreateExpenseApproverSettingRequest {
  approvalType: 'manager' | 'executive';
  approverId: string;
  isActive?: boolean;
  priority?: number;
}

export interface UpdateExpenseApproverSettingRequest {
  approvalType: 'manager' | 'executive';
  approverId: string;
  isActive?: boolean;
  priority?: number;
}

export interface GetExpenseApproverSettingHistoriesFilters {
  page?: number;
  limit?: number;
  settingId?: string;
}

/**
 * 経費承認者設定API
 */
export const expenseApproverSettingApi = {
  /**
   * すべての承認者設定を取得
   */
  async getApproverSettings(approvalType?: 'manager' | 'executive'): Promise<ExpenseApproverSettingsResponse> {
    try {
      DebugLogger.info(
        { category: 'API', operation: 'GetApproverSettings' },
        'Getting approver settings',
        { approvalType }
      );

      const params = approvalType ? { approval_type: approvalType } : {};
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.get('/expense-approvers', { 
        params,
        timeout: 30000,
      });

      const result = convertSnakeToCamel<ExpenseApproverSettingsResponse>(response.data);
      
      DebugLogger.info(
        { category: 'API', operation: 'GetApproverSettings' },
        'Approver settings retrieved',
        {
          count: result.settings.length,
        }
      );

      return result;
    } catch (error) {
      DebugLogger.error({ category: 'EXPENSE_APPROVER_SETTING_API', operation: 'GetSettings' }, 'Failed to get approver settings', error);
      throw error;
    }
  },

  /**
   * 承認者設定を作成
   */
  async createApproverSetting(request: CreateExpenseApproverSettingRequest): Promise<ExpenseApproverSetting> {
    try {
      DebugLogger.info(
        { category: 'API', operation: 'CreateApproverSetting' },
        'Creating approver setting',
        { 
          approvalType: request.approvalType,
          approverId: request.approverId,
        }
      );

      const payload = convertCamelToSnake(request);
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.post('/expense-approvers', payload);
      const result = convertSnakeToCamel<ExpenseApproverSetting>(response.data);

      DebugLogger.info(
        { category: 'API', operation: 'CreateApproverSetting' },
        'Approver setting created successfully',
        {
          id: result.id,
          approvalType: result.approvalType,
        }
      );

      return result;
    } catch (error) {
      DebugLogger.error({ category: 'EXPENSE_APPROVER_SETTING_API', operation: 'CreateSetting' }, 'Failed to create approver setting', error);
      throw error;
    }
  },

  /**
   * 承認者設定を更新
   */
  async updateApproverSetting(
    settingId: string, 
    request: UpdateExpenseApproverSettingRequest
  ): Promise<ExpenseApproverSetting> {
    try {
      DebugLogger.info(
        { category: 'API', operation: 'UpdateApproverSetting' },
        'Updating approver setting',
        { 
          settingId,
          approvalType: request.approvalType,
        }
      );

      const payload = convertCamelToSnake(request);
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.put(`/expense-approvers/${settingId}`, payload);
      const result = convertSnakeToCamel<ExpenseApproverSetting>(response.data);

      DebugLogger.info(
        { category: 'API', operation: 'UpdateApproverSetting' },
        'Approver setting updated successfully',
        {
          id: result.id,
          approvalType: result.approvalType,
        }
      );

      return result;
    } catch (error) {
      DebugLogger.error({ category: 'EXPENSE_APPROVER_SETTING_API', operation: 'UpdateSetting' }, 'Failed to update approver setting', error);
      throw error;
    }
  },

  /**
   * 承認者設定を削除
   */
  async deleteApproverSetting(settingId: string): Promise<void> {
    try {
      DebugLogger.info(
        { category: 'API', operation: 'DeleteApproverSetting' },
        'Deleting approver setting',
        { settingId }
      );

      const apiClient = createPresetApiClient('admin');
      await apiClient.delete(`/expense-approvers/${settingId}`);

      DebugLogger.info(
        { category: 'API', operation: 'DeleteApproverSetting' },
        'Approver setting deleted successfully',
        {
          settingId,
        }
      );
    } catch (error) {
      DebugLogger.error({ category: 'EXPENSE_APPROVER_SETTING_API', operation: 'DeleteSetting' }, 'Failed to delete approver setting', error);
      throw error;
    }
  },

  /**
   * 承認者設定履歴を取得
   */
  async getApproverSettingHistories(
    filters: GetExpenseApproverSettingHistoriesFilters = {}
  ): Promise<ExpenseApproverSettingHistoriesResponse> {
    try {
      DebugLogger.info(
        { category: 'API', operation: 'GetApproverSettingHistories' },
        'Getting approver setting histories',
        { filters }
      );

      const params = convertCamelToSnake(filters);
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.get('/expense-approvers/histories', { 
        params,
        timeout: 30000,
      });

      const result = convertSnakeToCamel<ExpenseApproverSettingHistoriesResponse>(response.data);
      
      DebugLogger.info(
        { category: 'API', operation: 'GetApproverSettingHistories' },
        'Approver setting histories retrieved',
        {
          count: result.histories.length,
          total: result.total,
        }
      );

      return result;
    } catch (error) {
      DebugLogger.error({ category: 'EXPENSE_APPROVER_SETTING_API', operation: 'GetHistories' }, 'Failed to get approver setting histories', error);
      throw error;
    }
  },
};

export default expenseApproverSettingApi;