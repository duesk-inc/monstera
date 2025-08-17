// Migrated to new API client system
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPresetApiClient } from '@/lib/api';

interface UnsubmittedReportsParams {
  department_id?: string;
  manager_id?: string;
  min_days_overdue?: number;
  max_days_overdue?: number;
  page?: number;
  limit?: number;
}

interface UnsubmittedReport {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  department: string;
  manager_name: string;
  start_date: string;
  end_date: string;
  days_overdue: number;
  reminder_sent_at?: string;
  reminder_count: number;
}

interface UnsubmittedSummary {
  total_unsubmitted: number;
  overdue_7days: number;
  overdue_14days: number;
  escalation_targets: number;
}

export const useUnsubmittedReports = (params: UnsubmittedReportsParams = {}) => {
  const queryClient = useQueryClient();

  // 未提出者一覧の取得
  const {
    data: reportsData,
    isLoading: loading,
    error,
    refetch: refresh,
  } = useQuery({
    queryKey: ['unsubmitted-reports', params],
    queryFn: async () => {
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.get('/weekly-reports/unsubmitted', {
        params,
      });
      return response.data;
    },
  });

  // 未提出者サマリーの取得
  const { data: summaryData } = useQuery({
    queryKey: ['unsubmitted-summary'],
    queryFn: async () => {
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.get('/weekly-reports/unsubmitted/summary');
      return response.data;
    },
  });

  // リマインド送信
  const sendRemindersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.post('/weekly-reports/remind', {
        user_ids: userIds,
        message: '週報の提出をお願いします。',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unsubmitted-reports'] });
      queryClient.invalidateQueries({ queryKey: ['unsubmitted-summary'] });
    },
  });

  return {
    reports: (reportsData?.reports || []) as UnsubmittedReport[],
    total: reportsData?.pagination?.total || 0,
    summary: summaryData as UnsubmittedSummary,
    loading,
    error,
    refresh,
    sendReminders: sendRemindersMutation.mutateAsync,
    sendingReminders: sendRemindersMutation.isPending,
  };
};