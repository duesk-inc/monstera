import { createPresetApiClient } from '@/lib/api';
import { convertSnakeToCamel, convertCamelToSnake } from '@/utils/apiUtils';
import { DebugLogger } from '../debug/logger';

// 経費申請集計レスポンスの型定義
export interface ExpensePeriodSummary {
  period: string;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  limit: number;
  remaining: number;
  usageRate: number;
}

export interface ExpenseSummaryResponse {
  monthly: ExpensePeriodSummary;
  yearly: ExpensePeriodSummary;
}

// 集計取得パラメータ
export interface ExpenseSummaryParams {
  year?: number;
  month?: number;
}

/**
 * 経費申請集計API
 */
export const expenseSummaryApi = {
  /**
   * 経費申請集計を取得
   * @param params 集計パラメータ
   * @returns 月次・年次集計結果
   */
  async getSummary(params: ExpenseSummaryParams = {}): Promise<ExpenseSummaryResponse> {
    try {
      DebugLogger.info(
        { category: 'API', operation: 'GetExpenseSummary' },
        'Getting expense summary',
        {
          year: params.year,
          month: params.month,
        }
      );

      const queryParams = convertCamelToSnake(params);
      
      const apiClient = createPresetApiClient('auth');
      const response = await apiClient.get('/expenses/summary', {
        params: queryParams,
        timeout: 15000,
      });

      const result = convertSnakeToCamel<ExpenseSummaryResponse>(response.data.data);

      DebugLogger.info(
        { category: 'API', operation: 'GetExpenseSummary' },
        'Summary retrieved successfully',
        {
          monthlyTotal: result.monthly.totalAmount,
          yearlyTotal: result.yearly.totalAmount,
          monthlyUsageRate: result.monthly.usageRate,
          yearlyUsageRate: result.yearly.usageRate,
        }
      );

      return result;
    } catch (error) {
      DebugLogger.error({ category: 'EXPENSE_SUMMARY_API', operation: 'GetSummary' }, 'Failed to get summary', error);
      throw error;
    }
  },

  /**
   * 特定年の月別集計を取得
   * @param year 年度
   * @returns 年次集計と月別ブレークダウン
   */
  async getYearlySummary(year: number): Promise<ExpenseSummaryResponse> {
    try {
      DebugLogger.info(
        { category: 'API', operation: 'GetYearlySummary' },
        'Getting yearly summary',
        { year }
      );

      return await this.getSummary({ year });
    } catch (error) {
      DebugLogger.error({ category: 'EXPENSE_SUMMARY_API', operation: 'GetYearlySummary' }, 'Failed to get yearly summary', error);
      throw error;
    }
  },

  /**
   * 特定月の集計を取得
   * @param year 年度
   * @param month 月
   * @returns 月次集計
   */
  async getMonthlySummary(year: number, month: number): Promise<ExpenseSummaryResponse> {
    try {
      DebugLogger.info(
        { category: 'API', operation: 'GetMonthlySummary' },
        'Getting monthly summary',
        { year, month }
      );

      return await this.getSummary({ year, month });
    } catch (error) {
      DebugLogger.error({ category: 'EXPENSE_SUMMARY_API', operation: 'GetMonthlySummary' }, 'Failed to get monthly summary', error);
      throw error;
    }
  },

  /**
   * 現在の月次・年次集計を取得
   * @returns 現在の月次・年次集計
   */
  async getCurrentSummary(): Promise<ExpenseSummaryResponse> {
    try {
      DebugLogger.info(
        { category: 'API', operation: 'GetCurrentSummary' },
        'Getting current summary'
      );

      const now = new Date();
      return await this.getSummary({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
    } catch (error) {
      DebugLogger.error({ category: 'EXPENSE_SUMMARY_API', operation: 'GetCurrentSummary' }, 'Failed to get current summary', error);
      throw error;
    }
  },
};

export default expenseSummaryApi;