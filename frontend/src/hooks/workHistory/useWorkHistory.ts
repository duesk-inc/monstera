import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { workHistoryApi } from '../../lib/api/workHistory';
import type {
  WorkHistoryData,
  WorkHistoryCreateRequest,
  WorkHistoryUpdateRequest,
  WorkHistoryListParams,
} from '../../types/workHistory';
import { useNotifications } from '../common/useNotifications';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';

// クエリキー定数
export const WORK_HISTORY_QUERY_KEYS = {
  all: ['workHistory'] as const,
  lists: () => [...WORK_HISTORY_QUERY_KEYS.all, 'list'] as const,
  list: (params: WorkHistoryListParams) => [...WORK_HISTORY_QUERY_KEYS.lists(), params] as const,
  details: () => [...WORK_HISTORY_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...WORK_HISTORY_QUERY_KEYS.details(), id] as const,
  temporarySave: () => [...WORK_HISTORY_QUERY_KEYS.all, 'temporarySave'] as const,
  summary: () => [...WORK_HISTORY_QUERY_KEYS.all, 'summary'] as const,
  itExperience: () => [...WORK_HISTORY_QUERY_KEYS.all, 'itExperience'] as const,
} as const;

interface UseWorkHistoryListOptions {
  params?: WorkHistoryListParams;
  enabled?: boolean;
}

export const useWorkHistoryList = (options: UseWorkHistoryListOptions = {}) => {
  const { params = {}, enabled = true } = options;

  return useQuery({
    queryKey: WORK_HISTORY_QUERY_KEYS.list(params),
    queryFn: () => workHistoryApi.getWorkHistory(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5分
  });
};

interface UseWorkHistoryDetailOptions {
  id: string;
  enabled?: boolean;
}

export const useWorkHistoryDetail = (options: UseWorkHistoryDetailOptions) => {
  const { id, enabled = true } = options;

  return useQuery({
    queryKey: WORK_HISTORY_QUERY_KEYS.detail(id),
    queryFn: () => workHistoryApi.getWorkHistoryById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5分
  });
};

export const useTemporarySave = () => {
  return useQuery({
    queryKey: WORK_HISTORY_QUERY_KEYS.temporarySave(),
    queryFn: () => workHistoryApi.getTemporarySave(),
    staleTime: 2 * 60 * 1000, // 2分
  });
};

export const useWorkHistorySummary = () => {
  return useQuery({
    queryKey: WORK_HISTORY_QUERY_KEYS.summary(),
    queryFn: () => workHistoryApi.getWorkHistory(),
    staleTime: 10 * 60 * 1000, // 10分
  });
};

export const useITExperience = () => {
  return useQuery({
    queryKey: WORK_HISTORY_QUERY_KEYS.itExperience(),
    queryFn: () => workHistoryApi.getITExperience(),
    staleTime: 10 * 60 * 1000, // 10分
  });
};

export const useCreateWorkHistory = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const { handleSubmissionError } = useEnhancedErrorHandler();

  return useMutation({
    mutationFn: (data: WorkHistoryCreateRequest) => workHistoryApi.createWorkHistory(data),
    onSuccess: (data: WorkHistoryData) => {
      showSuccess('職務経歴を作成しました');
      
      // 関連するクエリを無効化してリフレッシュ
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.summary() });
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.itExperience() });
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.temporarySave() });
      
      // 新しく作成されたデータをキャッシュに追加
      if (data.id) {
        queryClient.setQueryData(WORK_HISTORY_QUERY_KEYS.detail(data.id), data);
      }
    },
    onError: (error: unknown) => {
      handleSubmissionError(error, '職務経歴作成');
    },
  });
};

export const useUpdateWorkHistory = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const { handleSubmissionError } = useEnhancedErrorHandler();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkHistoryUpdateRequest }) =>
      workHistoryApi.updateWorkHistory(id, data),
    onSuccess: (data: WorkHistoryData, variables) => {
      showSuccess('職務経歴を更新しました');
      
      // 関連するクエリを無効化してリフレッシュ
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.summary() });
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.itExperience() });
      
      // 更新されたデータをキャッシュに設定
      queryClient.setQueryData(WORK_HISTORY_QUERY_KEYS.detail(variables.id), data);
    },
    onError: (error: unknown) => {
      handleSubmissionError(error, '職務経歴更新');
    },
  });
};

export const useDeleteWorkHistory = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const { handleSubmissionError } = useEnhancedErrorHandler();

  return useMutation({
    mutationFn: (id: string) => workHistoryApi.deleteWorkHistory(id),
    onSuccess: (_, deletedId) => {
      showSuccess('職務経歴を削除しました');
      
      // 関連するクエリを無効化してリフレッシュ
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.summary() });
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.itExperience() });
      
      // 削除されたデータをキャッシュから除去
      queryClient.removeQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.detail(deletedId) });
    },
    onError: (error: unknown) => {
      handleSubmissionError(error, '職務経歴削除');
    },
  });
};

export const useSaveTemporary = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const { handleSubmissionError } = useEnhancedErrorHandler();

  return useMutation({
    mutationFn: (data: WorkHistoryCreateRequest) => workHistoryApi.saveTemporary(data),
    onSuccess: () => {
      showSuccess('一時保存しました');
      // 一時保存データのクエリを無効化
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.temporarySave() });
    },
    onError: (error: unknown) => {
      handleSubmissionError(error, '一時保存');
    },
  });
};

export const useDeleteTemporary = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const { handleSubmissionError } = useEnhancedErrorHandler();

  return useMutation({
    mutationFn: () => workHistoryApi.deleteTemporarySave(),
    onSuccess: () => {
      showSuccess('一時保存データを削除しました');
      // 一時保存データのクエリを無効化
      queryClient.invalidateQueries({ queryKey: WORK_HISTORY_QUERY_KEYS.temporarySave() });
    },
    onError: (error: unknown) => {
      handleSubmissionError(error, '一時保存データ削除');
    },
  });
};

// 便利な統合フック
export const useWorkHistory = () => {
  const createMutation = useCreateWorkHistory();
  const updateMutation = useUpdateWorkHistory();
  const deleteMutation = useDeleteWorkHistory();
  const saveTemporaryMutation = useSaveTemporary();
  const deleteTemporaryMutation = useDeleteTemporary();

  const isLoading = 
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    saveTemporaryMutation.isPending ||
    deleteTemporaryMutation.isPending;

  const handleCreate = useCallback(async (data: WorkHistoryCreateRequest) => {
    return createMutation.mutateAsync(data);
  }, [createMutation]);

  const handleUpdate = useCallback(async (id: string, data: WorkHistoryUpdateRequest) => {
    return updateMutation.mutateAsync({ id, data });
  }, [updateMutation]);

  const handleDelete = useCallback(async (id: string) => {
    return deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const handleSaveTemporary = useCallback(async (data: WorkHistoryCreateRequest) => {
    return saveTemporaryMutation.mutateAsync(data);
  }, [saveTemporaryMutation]);

  const handleDeleteTemporary = useCallback(async () => {
    return deleteTemporaryMutation.mutateAsync();
  }, [deleteTemporaryMutation]);

  return {
    // Mutation handlers
    handleCreate,
    handleUpdate,
    handleDelete,
    handleSaveTemporary,
    handleDeleteTemporary,
    
    // Loading states
    isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSavingTemporary: saveTemporaryMutation.isPending,
    isDeletingTemporary: deleteTemporaryMutation.isPending,
    
    // Error states
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    saveTemporaryError: saveTemporaryMutation.error,
    deleteTemporaryError: deleteTemporaryMutation.error,
  };
};

export default useWorkHistory;