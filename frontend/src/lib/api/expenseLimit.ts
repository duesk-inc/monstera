import { apiClient } from './index';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import { DebugLogger } from '../debug/logger';

// 上限チェック結果の型定義
export interface LimitCheckResult {
  withinMonthlyLimit: boolean;
  withinYearlyLimit: boolean;
  monthlyLimitAmount: number;
  yearlyLimitAmount: number;
  currentMonthlyAmount: number;
  currentYearlyAmount: number;
  remainingMonthlyAmount: number;
  remainingYearlyAmount: number;
  warningThreshold: number;
  isNearMonthlyLimit: boolean;
  isNearYearlyLimit: boolean;
  projectedMonthlyAmount?: number;
  projectedYearlyAmount?: number;
}

// 上限チェックリクエストパラメータ
export interface CheckLimitsParams {
  amount: number;
  expenseDate?: string; // ISO date string
}

// 経費申請上限設定の型定義
export interface ExpenseLimit {
  id: string;
  limitType: 'monthly' | 'yearly';
  amount: number;
  effectiveFrom: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// 上限更新リクエスト
export interface UpdateExpenseLimitRequest {
  limitType: 'monthly' | 'yearly';
  amount: number;
  effectiveFrom: string;
}

/**
 * 経費申請上限チェックAPI
 */
export const expenseLimitApi = {
  /**
   * 上限チェックを実行
   * @param params チェックパラメータ
   * @returns 上限チェック結果
   */
  async checkLimits(params: CheckLimitsParams): Promise<LimitCheckResult> {
    try {
      DebugLogger.log('EXPENSE_LIMIT_API', 'Checking expense limits', {
        amount: params.amount,
        expenseDate: params.expenseDate,
      });

      const queryParams = convertCamelToSnake({
        amount: params.amount.toString(),
        expenseDate: params.expenseDate,
      });

      const response = await apiClient.get('/expenses/check-limits', {
        params: queryParams,
        timeout: 10000,
      });

      const result = convertSnakeToCamel<LimitCheckResult>(response.data.data);

      DebugLogger.log('EXPENSE_LIMIT_API', 'Limits checked successfully', {
        withinMonthlyLimit: result.withinMonthlyLimit,
        withinYearlyLimit: result.withinYearlyLimit,
        remainingMonthlyAmount: result.remainingMonthlyAmount,
        remainingYearlyAmount: result.remainingYearlyAmount,
      });

      return result;
    } catch (error) {
      DebugLogger.error('EXPENSE_LIMIT_API', 'Failed to check limits', error);
      throw error;
    }
  },

  /**
   * リアルタイム上限チェック（デバウンス用）
   * @param params チェックパラメータ
   * @returns 上限チェック結果
   */
  async checkLimitsRealtime(params: CheckLimitsParams): Promise<LimitCheckResult> {
    try {
      DebugLogger.log('EXPENSE_LIMIT_API', 'Real-time limit check', {
        amount: params.amount,
      });

      // リアルタイムチェックでは日付パラメータを省略可能
      const queryParams = convertCamelToSnake({
        amount: params.amount.toString(),
        ...(params.expenseDate && { expenseDate: params.expenseDate }),
      });

      const response = await apiClient.get('/expenses/check-limits', {
        params: queryParams,
        timeout: 5000, // リアルタイムチェックは短めのタイムアウト
      });

      const result = convertSnakeToCamel<LimitCheckResult>(response.data.data);

      DebugLogger.log('EXPENSE_LIMIT_API', 'Real-time check completed', {
        withinLimits: result.withinMonthlyLimit && result.withinYearlyLimit,
        isNearLimit: result.isNearMonthlyLimit || result.isNearYearlyLimit,
      });

      return result;
    } catch (error) {
      DebugLogger.error('EXPENSE_LIMIT_API', 'Real-time check failed', error);
      throw error;
    }
  },

  /**
   * 経費申請上限一覧を取得（管理者向け）
   * @returns 上限設定一覧
   */
  async getExpenseLimits(): Promise<ExpenseLimit[]> {
    try {
      DebugLogger.log('EXPENSE_LIMIT_API', 'Getting expense limits', {});

      const response = await apiClient.get('/admin/expense-limits');
      const limits = convertSnakeToCamel<ExpenseLimit[]>(response.data.data);

      DebugLogger.log('EXPENSE_LIMIT_API', 'Expense limits retrieved successfully', {
        count: limits.length,
      });

      return limits;
    } catch (error) {
      DebugLogger.error('EXPENSE_LIMIT_API', 'Failed to get expense limits', error);
      throw error;
    }
  },

  /**
   * 経費申請上限を更新（管理者向け）
   * @param request 更新リクエスト
   * @returns 更新された上限設定
   */
  async updateExpenseLimit(request: UpdateExpenseLimitRequest): Promise<ExpenseLimit> {
    try {
      DebugLogger.log('EXPENSE_LIMIT_API', 'Updating expense limit', {
        limitType: request.limitType,
        amount: request.amount,
        effectiveFrom: request.effectiveFrom,
      });

      const requestData = convertCamelToSnake(request);
      const response = await apiClient.put('/admin/expense-limits', requestData);
      const updatedLimit = convertSnakeToCamel<ExpenseLimit>(response.data.data);

      DebugLogger.log('EXPENSE_LIMIT_API', 'Expense limit updated successfully', {
        id: updatedLimit.id,
        limitType: updatedLimit.limitType,
        amount: updatedLimit.amount,
      });

      return updatedLimit;
    } catch (error) {
      DebugLogger.error('EXPENSE_LIMIT_API', 'Failed to update expense limit', error);
      throw error;
    }
  },
};

export default expenseLimitApi;