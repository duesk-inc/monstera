import { adminGet, adminPost, adminPut, adminDownload } from './index';
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
    start_date?: string; // backward compat
    end_date?: string;   // backward compat
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminWeeklyReportListResponse> => {
    // Backend expects date_from/date_to. Map legacy keys for safety.
    const qp: any = { ...params };
    if (params?.start_date && !params?.date_from) qp.date_from = params.start_date;
    if (params?.end_date && !params?.date_to) qp.date_to = params.end_date;
    delete qp.start_date;
    delete qp.end_date;
    return adminGet<AdminWeeklyReportListResponse>('/engineers/weekly-reports', qp);
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
   * 週報にコメントを追加（単一のエンドポイントに統一）
   */
  commentWeeklyReport: async (id: string, data: AdminWeeklyReportCommentRequest): Promise<void> => {
    await adminPost<void>(`/engineers/weekly-reports/${id}/comment`, data);
  },
  
  // 互換性のためのエイリアス（戻り値を既存呼出しに合わせて返す）
  addComment: async (id: string, data: { comment: string }): Promise<{ comment: any }> => {
    await adminPost<void>(`/engineers/weekly-reports/${id}/comment`, data);
    return { comment: data };
  },

  /**
   * 週報を承認
   */
  approveWeeklyReport: async (id: string, comment?: string): Promise<{ report: AdminWeeklyReport }> => {
    const response = await adminPut<AdminWeeklyReportDetailResponse>(`/engineers/weekly-reports/${id}/approve`, comment ? { comment } : undefined);
    return { report: response.report };
  },

  /**
   * 週報を却下
   */
  rejectWeeklyReport: async (id: string, comment: string): Promise<{ report: AdminWeeklyReport }> => {
    const response = await adminPut<AdminWeeklyReportDetailResponse>(`/engineers/weekly-reports/${id}/reject`, { comment });
    return { report: response.report };
  },

  /**
   * 週報を差し戻し
   */
  returnWeeklyReport: async (id: string, comment: string): Promise<{ report: AdminWeeklyReport }> => {
    const response = await adminPut<AdminWeeklyReportDetailResponse>(`/engineers/weekly-reports/${id}/return`, { comment });
    return { report: response.report };
  },

  // 重複していた `/comments` エンドポイントは廃止

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
    const y = data.year;
    const m = String(data.month).padStart(2, '0');
    const format = data.format || 'csv';
    const filename = `monthly_report_${y}${m}.${format}`;
    const path = `/engineers/weekly-reports/export?month=${y}-${m}&format=${format}&schema=weekly_minimal`;
    // サーバはPOSTルート（クエリでmonth/formatを渡す）。Content-Disposition対応・BOM付与
    return adminDownload(path, filename, undefined, 'POST', { accept: 'text/csv', addBOM: false });
  },
  
  // 互換性のためのエイリアス
  exportWeeklyReports: async (params: {
    format: 'csv'; // Excelは初期スコープ外
    status?: string;
    // legacy
    start_date?: string;
    end_date?: string;
    // preferred
    date_from?: string;
    date_to?: string;
  }): Promise<void> => {
    const filename = `weekly_reports.${params.format}`;
    // BEはmonth/formatのクエリを期待。from/toがある場合はfromからYYYY-MMを導出、なければ現在月。
    const toISO = (s?: string) => (s ? new Date(s) : undefined);
    const from = toISO(params.date_from || params.start_date);
    const now = new Date();
    const base = from || now;
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const format = params.format || 'csv';
    const path = `/engineers/weekly-reports/export?month=${y}-${m}&format=${format}&schema=weekly_minimal`;
    return adminDownload(path, filename, undefined, 'POST', { accept: 'text/csv', addBOM: false });
  },
};
