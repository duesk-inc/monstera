import apiClient from '@/lib/api';

export interface UnsubmittedSummary {
  total_unsubmitted: number;
  by_overdue_days: {
    [key: string]: number;
  };
  overdue_14days_plus: number;
}

export const unsubmittedReportApi = {
  // 未提出者サマリーを取得
  getSummary: async (): Promise<UnsubmittedSummary> => {
    const response = await apiClient.get('/api/v1/unsubmitted-reports/summary');
    return response.data;
  },
};