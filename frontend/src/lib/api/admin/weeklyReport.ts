import { adminGet, adminPost, adminDownload } from './index';
import { 
  AdminWeeklyReport,
  AdminWeeklyReportListResponse,
  AdminWeeklyReportDetailResponse,
  AdminWeeklyReportCommentRequest,
  AdminMonthlyAttendanceResponse,
  AdminFollowUpRequiredUsersResponse,
  AdminWeeklyReportExportRequest
} from '@/types/admin/weeklyReport';

export const adminWeeklyReportApi = {
  /**
   * 週報一覧を取得
   */
  getWeeklyReports: async (params?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminWeeklyReportListResponse> => {
    return adminGet<AdminWeeklyReportListResponse>('/engineers/weekly-reports', params);
  },

  /**
   * 週報詳細を取得
   */
  getWeeklyReportDetail: async (id: string): Promise<AdminWeeklyReportDetailResponse> => {
    return adminGet<AdminWeeklyReportDetailResponse>(`/engineers/weekly-reports/${id}`);
  },
  
  // 互換性のためのエイリアス
  getWeeklyReport: async (id: string): Promise<AdminWeeklyReportDetailResponse> => {
    return adminGet<AdminWeeklyReportDetailResponse>(`/engineers/weekly-reports/${id}`);
  },

  /**
   * 週報にコメントを追加
   */
  commentWeeklyReport: async (id: string, data: AdminWeeklyReportCommentRequest): Promise<void> => {
    return adminPost<void>(`/engineers/weekly-reports/${id}/comment`, data);
  },
  
  // 互換性のためのエイリアス
  addComment: async (id: string, data: { comment: string }): Promise<{ comment: any }> => {
    await adminPost<void>(`/engineers/weekly-reports/${id}/comment`, data);
    return { comment: data };
  },

  /**
   * 週報を承認
   */
  approveWeeklyReport: async (id: string): Promise<{ report: AdminWeeklyReport }> => {
    const response = await adminPost<AdminWeeklyReportDetailResponse>(`/engineers/weekly-reports/${id}/approve`);
    return { report: response.report };
  },

  /**
   * 週報を却下
   */
  rejectWeeklyReport: async (id: string, reason: string): Promise<{ report: AdminWeeklyReport }> => {
    const response = await adminPost<AdminWeeklyReportDetailResponse>(`/engineers/weekly-reports/${id}/reject`, { reason });
    return { report: response.report };
  },

  /**
   * 週報にコメントを追加
   */
  addComment: async (id: string, data: AdminWeeklyReportCommentRequest): Promise<{ comment: any }> => {
    const response = await adminPost<{ comment: any }>(`/engineers/weekly-reports/${id}/comments`, data);
    return response;
  },

  /**
   * 月次勤怠データを取得
   */
  getMonthlyAttendance: async (params: {
    year: number;
    month: number;
    user_id?: string;
  }): Promise<AdminMonthlyAttendanceResponse> => {
    return adminGet<AdminMonthlyAttendanceResponse>('/engineers/weekly-reports/monthly-attendance', params);
  },

  /**
   * フォローアップ対象者を取得
   */
  getFollowUpRequiredUsers: async (): Promise<AdminFollowUpRequiredUsersResponse> => {
    return adminGet<AdminFollowUpRequiredUsersResponse>('/engineers/follow-up-required');
  },

  /**
   * 月次レポートをエクスポート
   */
  exportMonthlyReport: async (data: AdminWeeklyReportExportRequest): Promise<void> => {
    const filename = `monthly_report_${data.year}${String(data.month).padStart(2, '0')}.${data.format}`;
    return adminDownload('/engineers/weekly-reports/export', filename, data);
  },
  
  // 互換性のためのエイリアス
  exportWeeklyReports: async (params: {
    format: 'csv' | 'excel';
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<void> => {
    const filename = `weekly_reports.${params.format}`;
    return adminDownload('/engineers/weekly-reports/export', filename, params);
  },
};