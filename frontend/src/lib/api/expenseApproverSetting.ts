import { apiClient } from './index';
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
      DebugLogger.log('EXPENSE_APPROVER_SETTING_API', 'Getting approver settings', { approvalType });

      const params = approvalType ? { approval_type: approvalType } : {};
      const response = await apiClient.get('/admin/expense-approvers', { 
        params,
        timeout: 30000,
      });

      const result = convertSnakeToCamel<ExpenseApproverSettingsResponse>(response.data);
      
      DebugLogger.log('EXPENSE_APPROVER_SETTING_API', 'Approver settings retrieved', {
        count: result.settings.length,
      });

      return result;
    } catch (error) {
      DebugLogger.error('EXPENSE_APPROVER_SETTING_API', 'Failed to get approver settings', error);
      throw error;
    }
  },

  /**
   * 承認者設定を作成
   */
  async createApproverSetting(request: CreateExpenseApproverSettingRequest): Promise<ExpenseApproverSetting> {
    try {
      DebugLogger.log('EXPENSE_APPROVER_SETTING_API', 'Creating approver setting', { 
        approvalType: request.approvalType,
        approverId: request.approverId,
      });

      const payload = convertCamelToSnake(request);
      const response = await apiClient.post('/admin/expense-approvers', payload);
      const result = convertSnakeToCamel<ExpenseApproverSetting>(response.data);

      DebugLogger.log('EXPENSE_APPROVER_SETTING_API', 'Approver setting created successfully', {
        id: result.id,
        approvalType: result.approvalType,
      });

      return result;
    } catch (error) {
      DebugLogger.error('EXPENSE_APPROVER_SETTING_API', 'Failed to create approver setting', error);
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
      DebugLogger.log('EXPENSE_APPROVER_SETTING_API', 'Updating approver setting', { 
        settingId,
        approvalType: request.approvalType,
      });

      const payload = convertCamelToSnake(request);
      const response = await apiClient.put(`/admin/expense-approvers/${settingId}`, payload);
      const result = convertSnakeToCamel<ExpenseApproverSetting>(response.data);

      DebugLogger.log('EXPENSE_APPROVER_SETTING_API', 'Approver setting updated successfully', {
        id: result.id,
        approvalType: result.approvalType,
      });

      return result;
    } catch (error) {
      DebugLogger.error('EXPENSE_APPROVER_SETTING_API', 'Failed to update approver setting', error);
      throw error;
    }
  },

  /**
   * 承認者設定を削除
   */
  async deleteApproverSetting(settingId: string): Promise<void> {
    try {
      DebugLogger.log('EXPENSE_APPROVER_SETTING_API', 'Deleting approver setting', { settingId });

      await apiClient.delete(`/admin/expense-approvers/${settingId}`);

      DebugLogger.log('EXPENSE_APPROVER_SETTING_API', 'Approver setting deleted successfully', {
        settingId,
      });
    } catch (error) {
      DebugLogger.error('EXPENSE_APPROVER_SETTING_API', 'Failed to delete approver setting', error);
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
      DebugLogger.log('EXPENSE_APPROVER_SETTING_API', 'Getting approver setting histories', { filters });

      const params = convertCamelToSnake(filters);
      const response = await apiClient.get('/admin/expense-approvers/histories', { 
        params,
        timeout: 30000,
      });

      const result = convertSnakeToCamel<ExpenseApproverSettingHistoriesResponse>(response.data);
      
      DebugLogger.log('EXPENSE_APPROVER_SETTING_API', 'Approver setting histories retrieved', {
        count: result.histories.length,
        total: result.total,
      });

      return result;
    } catch (error) {
      DebugLogger.error('EXPENSE_APPROVER_SETTING_API', 'Failed to get approver setting histories', error);
      throw error;
    }
  },
};

export default expenseApproverSettingApi;