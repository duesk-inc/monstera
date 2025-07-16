import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/common/Toast';
import { alertApi } from '@/lib/api/admin/alert';
import {
  AlertSettings,
  CreateAlertSettingsRequest,
  UpdateAlertSettingsRequest,
  AlertFilters,
} from '@/types/admin/alert';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';

// Query Keys
export const ALERT_QUERY_KEYS = {
  alertSettings: ['alert-settings'] as const,
  alertSettingsList: (page: number, limit: number) => 
    ['alert-settings', 'list', page, limit] as const,
  alertSettingsDetail: (id: string) => 
    ['alert-settings', 'detail', id] as const,
  alertHistories: (filters: AlertFilters, page: number, limit: number) =>
    ['alert-histories', filters, page, limit] as const,
  alertHistoryDetail: (id: string) =>
    ['alert-histories', 'detail', id] as const,
  alertSummary: ['alert-summary'] as const,
};

// アラート設定管理フック
export const useAlertSettings = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const { handleSubmissionError } = useEnhancedErrorHandler();

  // アラート設定一覧取得
  const useAlertSettingsList = (page = 1, limit = 20) => {
    return useQuery({
      queryKey: ALERT_QUERY_KEYS.alertSettingsList(page, limit),
      queryFn: () => alertApi.getAlertSettings(page, limit),
      staleTime: 5 * 60 * 1000, // 5分
    });
  };

  // アラート設定詳細取得
  const useAlertSettingsDetail = (id: string) => {
    return useQuery({
      queryKey: ALERT_QUERY_KEYS.alertSettingsDetail(id),
      queryFn: () => alertApi.getAlertSettingById(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    });
  };

  // アラート設定作成
  const createAlertSettingsMutation = useMutation({
    mutationFn: (data: CreateAlertSettingsRequest) => alertApi.createAlertSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.alertSettings });
      showSuccess('アラート設定を作成しました');
    },
    onError: (error) => {
      handleSubmissionError(error, 'アラート設定作成');
    },
  });

  // アラート設定更新
  const updateAlertSettingsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAlertSettingsRequest }) =>
      alertApi.updateAlertSettings(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.alertSettings });
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.alertSettingsDetail(id) });
      showSuccess('アラート設定を更新しました');
    },
    onError: (error) => {
      handleSubmissionError(error, 'アラート設定更新');
    },
  });

  // アラート設定削除
  const deleteAlertSettingsMutation = useMutation({
    mutationFn: (id: string) => alertApi.deleteAlertSettings(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.alertSettings });
      showSuccess('アラート設定を削除しました');
    },
    onError: (error) => {
      handleSubmissionError(error, 'アラート設定削除');
    },
  });

  // アラート履歴一覧取得
  const useAlertHistoriesList = (filters: AlertFilters = {}, page = 1, limit = 20) => {
    return useQuery({
      queryKey: ALERT_QUERY_KEYS.alertHistories(filters, page, limit),
      queryFn: () => alertApi.getAlertHistories(filters, page, limit),
      staleTime: 2 * 60 * 1000, // 2分
    });
  };

  // アラート履歴詳細取得
  const useAlertHistoryDetail = (id: string) => {
    return useQuery({
      queryKey: ALERT_QUERY_KEYS.alertHistoryDetail(id),
      queryFn: () => alertApi.getAlertHistoryById(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    });
  };

  // アラートステータス更新
  const updateAlertStatusMutation = useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: string; comment?: string }) =>
      alertApi.updateAlertStatus(id, { status: status as any, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-histories'] });
      showSuccess('アラートステータスを更新しました');
    },
    onError: (error) => {
      handleSubmissionError(error, 'アラートステータス更新');
    },
  });

  // アラートサマリー取得
  const useAlertSummary = () => {
    return useQuery({
      queryKey: ALERT_QUERY_KEYS.alertSummary,
      queryFn: () => alertApi.getAlertSummary(),
      staleTime: 1 * 60 * 1000, // 1分
    });
  };

  return {
    // Queries
    useAlertSettingsList,
    useAlertSettingsDetail,
    useAlertHistoriesList,
    useAlertHistoryDetail,
    useAlertSummary,
    
    // Mutations
    createAlertSettings: createAlertSettingsMutation.mutateAsync,
    updateAlertSettings: updateAlertSettingsMutation.mutateAsync,
    deleteAlertSettings: deleteAlertSettingsMutation.mutateAsync,
    updateAlertStatus: updateAlertStatusMutation.mutateAsync,
    
    // Loading states
    isCreating: createAlertSettingsMutation.isPending,
    isUpdating: updateAlertSettingsMutation.isPending,
    isDeleting: deleteAlertSettingsMutation.isPending,
    isUpdatingStatus: updateAlertStatusMutation.isPending,
  };
};