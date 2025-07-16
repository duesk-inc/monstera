import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminEngineerApi } from '@/lib/api/admin/engineer';
import { queryKeys } from '@/lib/tanstack-query';
import { 
  Engineer,
  EngineerDetail,
  GetEngineersParams,
  GetEngineersResponse,
  CreateEngineerRequest,
  UpdateEngineerRequest,
  UpdateEngineerStatusRequest,
  ExportOptions,
  ImportResult
} from '@/types/engineer';
import { useToast } from '@/components/common/Toast/ToastProvider';
import { DEFAULT_PAGE_SIZE } from '@/constants/engineer';
import React from 'react';

// エンジニア一覧用フック
export const useEngineersQuery = (params?: GetEngineersParams) => {
  return useQuery({
    queryKey: queryKeys.adminEngineers(params),
    queryFn: async () => {
      const response = await adminEngineerApi.getEngineers(params || {});
      return response;
    },
  });
};

// エンジニア詳細用フック
export const useEngineerDetailQuery = (id: string) => {
  return useQuery({
    queryKey: queryKeys.adminEngineerDetail(id),
    queryFn: async () => {
      const response = await adminEngineerApi.getEngineerDetail(id);
      return response;
    },
    enabled: !!id,
  });
};

// エンジニア統計用フック
export const useEngineerStatisticsQuery = () => {
  return useQuery({
    queryKey: queryKeys.adminEngineerStatistics,
    queryFn: async () => {
      const response = await adminEngineerApi.getStatistics();
      return response;
    },
  });
};

// エンジニア作成ミューテーション
export const useCreateEngineer = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (data: CreateEngineerRequest) => {
      const response = await adminEngineerApi.createEngineer(data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineerStatistics });
      showSuccess('エンジニアを登録しました');
    },
    onError: (error: any) => {
      const message = error?.message || 'エンジニアの登録に失敗しました';
      showError(message);
    },
  });
};

// エンジニア更新ミューテーション
export const useUpdateEngineer = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEngineerRequest }) => {
      const response = await adminEngineerApi.updateEngineer(id, data);
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineerDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineerStatistics });
      showSuccess('エンジニア情報を更新しました');
    },
    onError: (error: any) => {
      const message = error?.message || 'エンジニア情報の更新に失敗しました';
      showError(message);
    },
  });
};

// エンジニア削除ミューテーション
export const useDeleteEngineer = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await adminEngineerApi.deleteEngineer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineerStatistics });
      showSuccess('エンジニアを削除しました');
    },
    onError: (error: any) => {
      const message = error?.message || 'エンジニアの削除に失敗しました';
      showError(message);
    },
  });
};

// エンジニアステータス更新ミューテーション
export const useUpdateEngineerStatus = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEngineerStatusRequest }) => {
      const response = await adminEngineerApi.updateEngineerStatus(id, data);
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineerDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineerStatistics });
      showSuccess('ステータスを更新しました');
    },
    onError: (error: any) => {
      const message = error?.message || 'ステータスの更新に失敗しました';
      showError(message);
    },
  });
};

// CSV インポートミューテーション
export const useImportEngineersCSV = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showWarning, showError } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const response = await adminEngineerApi.importCSV(file);
      return response;
    },
    onSuccess: (data: ImportResult) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminEngineerStatistics });
      
      const { successCount, errorCount, totalRecords } = data;
      if (errorCount === 0) {
        showSuccess(`${successCount}件のエンジニアをインポートしました`);
      } else {
        showWarning(`${successCount}件成功、${errorCount}件エラーがありました`);
      }
    },
    onError: (error: any) => {
      const message = error?.message || 'CSVインポートに失敗しました';
      showError(message);
    },
  });
};

// 互換性のためのフック（一覧取得、検索、ページネーション）
export const useEngineers = (initialParams?: GetEngineersParams) => {
  const [params, setParams] = React.useState<GetEngineersParams>(
    initialParams || { 
      page: 1, 
      limit: DEFAULT_PAGE_SIZE,
      keyword: '',
      departmentId: '',
      engineerStatus: undefined,
      projectId: '',
      skillIds: [],
      orderBy: undefined,
      order: undefined
    }
  );

  const { data, isLoading, error, refetch } = useEngineersQuery(params);

  const updateParams = (newParams: Partial<GetEngineersParams>) => {
    setParams(prev => ({ ...prev, ...newParams }));
  };

  const resetFilters = () => {
    setParams({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      keyword: '',
      departmentId: '',
      engineerStatus: undefined,
      projectId: '',
      skillIds: [],
      orderBy: undefined,
      order: undefined
    });
  };

  const setPage = (page: number) => {
    setParams(prev => ({ ...prev, page }));
  };

  const setLimit = (limit: number) => {
    setParams(prev => ({ ...prev, limit, page: 1 }));
  };

  const setKeyword = (keyword: string) => {
    setParams(prev => ({ ...prev, keyword, page: 1 }));
  };

  const setFilters = (filters: Partial<GetEngineersParams>) => {
    setParams(prev => ({ ...prev, ...filters, page: 1 }));
  };

  return {
    // データ
    engineers: data?.engineers || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || DEFAULT_PAGE_SIZE,
    pages: data?.pages || 0,
    
    // 状態
    loading: isLoading,
    error,
    params,
    
    // アクション
    updateParams,
    resetFilters,
    setPage,
    setLimit,
    setKeyword,
    setFilters,
    refresh: () => refetch(),
  };
};

// エンジニア詳細用の便利フック
export const useEngineerDetail = (id: string) => {
  const { data: engineer, isLoading: loading, error, refetch } = useEngineerDetailQuery(id);
  const updateEngineer = useUpdateEngineer();
  const updateStatus = useUpdateEngineerStatus();

  return {
    engineer,
    loading,
    error,
    refresh: () => refetch(),
    updateEngineer: (data: UpdateEngineerRequest) => 
      updateEngineer.mutateAsync({ id, data }),
    updateStatus: (data: UpdateEngineerStatusRequest) => 
      updateStatus.mutateAsync({ id, data }),
  };
};

// エンジニア操作用の便利フック
export const useEngineerMutations = () => {
  const createEngineer = useCreateEngineer();
  const updateEngineer = useUpdateEngineer();
  const deleteEngineer = useDeleteEngineer();
  const updateStatus = useUpdateEngineerStatus();
  const importCSV = useImportEngineersCSV();

  return {
    // 基本操作
    createEngineer: (data: CreateEngineerRequest) => createEngineer.mutateAsync(data),
    updateEngineer: (id: string, data: UpdateEngineerRequest) => 
      updateEngineer.mutateAsync({ id, data }),
    deleteEngineer: (id: string) => deleteEngineer.mutateAsync(id),
    
    // ステータス操作
    updateStatus: (id: string, data: UpdateEngineerStatusRequest) => 
      updateStatus.mutateAsync({ id, data }),
    
    // CSV操作
    importCSV: (file: File) => importCSV.mutateAsync(file),
    exportCSV: (options: ExportOptions, filename?: string) => 
      adminEngineerApi.exportCSV(options, filename),
    downloadTemplate: () => adminEngineerApi.downloadTemplate(),
    
    // 状態
    submitting: createEngineer.isPending || updateEngineer.isPending || 
                deleteEngineer.isPending || updateStatus.isPending || 
                importCSV.isPending,
  };
};