import { adminGet } from './index';
import { WeeklyReportSummaryResponse, PeriodFilter } from '@/types/admin/weeklyReportSummary';

export const weeklyReportSummaryApi = {
  /**
   * 週報サマリー統計を取得
   */
  getSummary: async (filters: PeriodFilter): Promise<WeeklyReportSummaryResponse> => {
    const params = new URLSearchParams({
      start_date: filters.startDate,
      end_date: filters.endDate,
    });
    
    if (filters.departmentId) {
      params.append('department_id', filters.departmentId);
    }

    return adminGet<WeeklyReportSummaryResponse>(`/engineers/weekly-reports/summary?${params}`);
  },

  /**
   * 月次統計を取得（便利メソッド）
   */
  getMonthlySummary: async (year: number, month: number, departmentId?: string): Promise<WeeklyReportSummaryResponse> => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return weeklyReportSummaryApi.getSummary({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      departmentId,
    });
  },

  /**
   * 週次統計を取得（便利メソッド）
   */
  getWeeklySummary: async (weekStart: Date, departmentId?: string): Promise<WeeklyReportSummaryResponse> => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    return weeklyReportSummaryApi.getSummary({
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      departmentId,
    });
  },

  /**
   * 四半期統計を取得（便利メソッド）
   */
  getQuarterlySummary: async (year: number, quarter: number, departmentId?: string): Promise<WeeklyReportSummaryResponse> => {
    const startMonth = (quarter - 1) * 3 + 1;
    const startDate = new Date(year, startMonth - 1, 1);
    const endDate = new Date(year, startMonth + 2, 0);
    
    return weeklyReportSummaryApi.getSummary({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      departmentId,
    });
  },
};