import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { alertApi } from '@/lib/api/admin/alert';
import { AlertHistory, AlertFilters, UpdateAlertStatusRequest } from '@/types/admin/alert';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { useToast } from '@/components/common';

interface UseAlertHistoryResult {
  alertHistories: AlertHistory[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  updateStatus: (params: { id: string; status: string; comment?: string }) => Promise<void>;
  isUpdatingStatus: boolean;
}

export const useAlertHistory = (
  filters: AlertFilters = {},
  page: number = 1,
  limit: number = 20
): UseAlertHistoryResult => {
  const { handleSubmissionError } = useErrorHandler();
  const { showSuccess } = useToast();

  // アラート履歴一覧取得
  const {
    data: alertHistoryData,
    isLoading,
    isError,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: ['alertHistories', filters, page, limit],
    queryFn: () => alertApi.getAlertHistories(filters, page, limit),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // ステータス更新
  const updateStatusMutation = useMutation({
    mutationFn: async (params: { id: string; status: string; comment?: string }) => {
      const updateData: UpdateAlertStatusRequest = {
        status: params.status as any,
        comment: params.comment,
      };
      return alertApi.updateAlertStatus(params.id, updateData);
    },
    onSuccess: () => {
      showSuccess('アラートのステータスを更新しました');
      refetchQuery();
    },
    onError: (error: any) => {
      handleSubmissionError(error, 'ステータス更新');
    },
  });

  const refetch = useCallback(() => {
    refetchQuery();
  }, [refetchQuery]);

  const updateStatus = useCallback(async (params: { id: string; status: string; comment?: string }) => {
    return updateStatusMutation.mutateAsync(params);
  }, [updateStatusMutation]);

  return {
    alertHistories: alertHistoryData?.histories || [],
    total: alertHistoryData?.total || 0,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    updateStatus,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
};