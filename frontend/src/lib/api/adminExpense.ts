import { createPresetApiClient } from '@/lib/api';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import { DebugLogger } from '../debug/logger';

// 管理者用経費申請APIレスポンス型
export interface AdminExpenseApproval {
  approvalId: string;
  expenseId: string;
  title: string;
  amount: number;
  expenseDate: string;
  category: string;
  approvalType: 'manager' | 'executive';
  approvalOrder: number;
  requestedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  description: string;
  receiptUrls: string[];
  previousApproval?: {
    approverName: string;
    approvedAt: string;
    comment?: string;
  };
}

export interface AdminExpenseApprovalsResponse {
  items: AdminExpenseApproval[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminExpenseApprovalFilters {
  page?: number;
  limit?: number;
  category?: string;
  amountRange?: string;
  approvalType?: 'manager' | 'executive';
  startDate?: string;
  endDate?: string;
  userName?: string;
  status?: string;
}

export interface ApproveExpenseRequest {
  comment?: string;
  version: number;
}

export interface RejectExpenseRequest {
  comment: string;
  version: number;
}

export interface AdminExpenseDetail {
  id: string;
  userId: string;
  title: string;
  userName: string;
  userEmail: string;
  amount: number;
  category: string;
  categoryName: string;
  expenseDate: string;
  status: string;
  receiptUrl?: string;
  description: string;
  otherDetails?: string;
  submittedAt?: string;
  approvedAt?: string;
  approver?: {
    id: string;
    name: string;
    email: string;
  };
  approvals: Array<{
    id: string;
    approverName: string;
    approvalType: 'manager' | 'executive';
    status: 'pending' | 'approved' | 'rejected';
    comment?: string;
    approvedAt?: string;
  }>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 管理者用経費申請API
 */
export const adminExpenseApi = {
  /**
   * 承認待ち経費申請一覧を取得
   */
  async getPendingApprovals(filters: AdminExpenseApprovalFilters = {}): Promise<AdminExpenseApprovalsResponse> {
    try {
      DebugLogger.log('ADMIN_EXPENSE_API', 'Getting pending approvals', { filters });

      const params = convertCamelToSnake(filters);
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.get('/engineers/expenses/pending', { 
        params,
        timeout: 30000,
      });

      const result = convertSnakeToCamel<AdminExpenseApprovalsResponse>(response.data.data);
      
      DebugLogger.log('ADMIN_EXPENSE_API', 'Pending approvals retrieved', {
        count: result.items.length,
        total: result.total,
      });

      return result;
    } catch (error) {
      DebugLogger.error('ADMIN_EXPENSE_API', 'Failed to get pending approvals', error);
      throw error;
    }
  },

  /**
   * 経費申請詳細を取得（管理者用）
   */
  async getExpenseDetail(expenseId: string): Promise<AdminExpenseDetail> {
    try {
      DebugLogger.log('ADMIN_EXPENSE_API', 'Getting expense detail', { expenseId });

      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.get(`/engineers/expenses/${expenseId}`);
      const result = convertSnakeToCamel<AdminExpenseDetail>(response.data.data);

      DebugLogger.log('ADMIN_EXPENSE_API', 'Expense detail retrieved', {
        expenseId,
        status: result.status,
      });

      return result;
    } catch (error) {
      DebugLogger.error('ADMIN_EXPENSE_API', 'Failed to get expense detail', error);
      throw error;
    }
  },

  /**
   * 経費申請を承認
   */
  async approveExpense(expenseId: string, request: ApproveExpenseRequest): Promise<AdminExpenseDetail> {
    try {
      DebugLogger.log('ADMIN_EXPENSE_API', 'Approving expense', { 
        expenseId,
        hasComment: !!request.comment,
      });

      const payload = convertCamelToSnake(request);
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.put(`/engineers/expenses/${expenseId}/approve`, payload);
      const result = convertSnakeToCamel<AdminExpenseDetail>(response.data.data);

      DebugLogger.log('ADMIN_EXPENSE_API', 'Expense approved successfully', {
        expenseId,
        newStatus: result.status,
      });

      return result;
    } catch (error) {
      DebugLogger.error('ADMIN_EXPENSE_API', 'Failed to approve expense', error);
      throw error;
    }
  },

  /**
   * 経費申請を却下
   */
  async rejectExpense(expenseId: string, request: RejectExpenseRequest): Promise<AdminExpenseDetail> {
    try {
      DebugLogger.log('ADMIN_EXPENSE_API', 'Rejecting expense', { 
        expenseId,
        commentLength: request.comment.length,
      });

      const payload = convertCamelToSnake(request);
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.put(`/engineers/expenses/${expenseId}/reject`, payload);
      const result = convertSnakeToCamel<AdminExpenseDetail>(response.data.data);

      DebugLogger.log('ADMIN_EXPENSE_API', 'Expense rejected successfully', {
        expenseId,
        newStatus: result.status,
      });

      return result;
    } catch (error) {
      DebugLogger.error('ADMIN_EXPENSE_API', 'Failed to reject expense', error);
      throw error;
    }
  },

  /**
   * 承認統計情報を取得
   */
  async getApprovalStatistics(filters: { 
    startDate?: string; 
    endDate?: string; 
    approvalType?: 'manager' | 'executive';
  } = {}): Promise<{
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalAmount: number;
    averageAmount: number;
    categoryBreakdown: Array<{
      category: string;
      categoryName: string;
      count: number;
      totalAmount: number;
    }>;
  }> {
    try {
      DebugLogger.log('ADMIN_EXPENSE_API', 'Getting approval statistics', { filters });

      const params = convertCamelToSnake(filters);
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.get('/engineers/expenses/statistics', { 
        params,
      });

      const result = convertSnakeToCamel(response.data.data);

      DebugLogger.log('ADMIN_EXPENSE_API', 'Approval statistics retrieved', {
        totalPending: result.totalPending,
        totalApproved: result.totalApproved,
      });

      return result;
    } catch (error) {
      DebugLogger.error('ADMIN_EXPENSE_API', 'Failed to get approval statistics', error);
      throw error;
    }
  },

  /**
   * 経費申請履歴を取得（管理者用）
   */
  async getExpenseHistory(filters: {
    page?: number;
    limit?: number;
    userId?: string;
    category?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  } = {}): Promise<AdminExpenseApprovalsResponse> {
    try {
      DebugLogger.log('ADMIN_EXPENSE_API', 'Getting expense history', { filters });

      const params = convertCamelToSnake(filters);
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.get('/engineers/expenses/history', { 
        params,
      });

      const result = convertSnakeToCamel<AdminExpenseApprovalsResponse>(response.data.data);

      DebugLogger.log('ADMIN_EXPENSE_API', 'Expense history retrieved', {
        count: result.items.length,
        total: result.total,
      });

      return result;
    } catch (error) {
      DebugLogger.error('ADMIN_EXPENSE_API', 'Failed to get expense history', error);
      throw error;
    }
  },

  /**
   * 一括承認処理
   */
  async bulkApprove(expenseIds: string[], comment?: string): Promise<{
    succeeded: string[];
    failed: Array<{ expenseId: string; error: string }>;
  }> {
    try {
      DebugLogger.log('ADMIN_EXPENSE_API', 'Bulk approving expenses', { 
        count: expenseIds.length,
        hasComment: !!comment,
      });

      const payload = convertCamelToSnake({
        expenseIds,
        comment,
      });

      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.post('/engineers/expenses/bulk-approve', payload);
      const result = convertSnakeToCamel(response.data.data);

      DebugLogger.log('ADMIN_EXPENSE_API', 'Bulk approval completed', {
        succeeded: result.succeeded.length,
        failed: result.failed.length,
      });

      return result;
    } catch (error) {
      DebugLogger.error('ADMIN_EXPENSE_API', 'Failed to bulk approve expenses', error);
      throw error;
    }
  },

  /**
   * 一括却下処理
   */
  async bulkReject(expenseIds: string[], comment: string): Promise<{
    succeeded: string[];
    failed: Array<{ expenseId: string; error: string }>;
  }> {
    try {
      DebugLogger.log('ADMIN_EXPENSE_API', 'Bulk rejecting expenses', { 
        count: expenseIds.length,
        commentLength: comment.length,
      });

      const payload = convertCamelToSnake({
        expenseIds,
        comment,
      });

      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.post('/engineers/expenses/bulk-reject', payload);
      const result = convertSnakeToCamel(response.data.data);

      DebugLogger.log('ADMIN_EXPENSE_API', 'Bulk rejection completed', {
        succeeded: result.succeeded.length,
        failed: result.failed.length,
      });

      return result;
    } catch (error) {
      DebugLogger.error('ADMIN_EXPENSE_API', 'Failed to bulk reject expenses', error);
      throw error;
    }
  },

  /**
   * 経費申請をCSVエクスポート
   */
  async exportToCsv(filters: {
    startDate?: string;
    endDate?: string;
    category?: string;
    status?: string;
    userId?: string;
  } = {}): Promise<Blob> {
    try {
      DebugLogger.log('ADMIN_EXPENSE_API', 'Exporting expenses to CSV', { filters });

      const params = convertCamelToSnake(filters);
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.get('/engineers/expenses/export/csv', {
        params,
        responseType: 'blob',
        timeout: 60000, // CSVエクスポートは時間がかかる可能性があるため長めに設定
      });

      DebugLogger.log('ADMIN_EXPENSE_API', 'CSV export completed', {
        size: response.data.size,
      });

      return response.data;
    } catch (error) {
      DebugLogger.error('ADMIN_EXPENSE_API', 'Failed to export CSV', error);
      throw error;
    }
  },
};

export default adminExpenseApi;