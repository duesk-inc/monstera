import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSalesApi } from '@/lib/api/admin/sales';
import { queryKeys } from '@/lib/tanstack-query';
import { 
  SalesActivity,
  SalesPipeline,
  SalesSummary,
  ExtensionTarget,
  SalesTarget,
  SalesActivityCreateRequest,
  SalesActivityUpdateRequest
} from '@/types/admin/sales';
import { useToast } from '@/components/common/Toast';
import React from 'react';
import { PAGINATION } from '@/constants/pagination';

// 営業活動一覧用フック
export const useSalesActivitiesQuery = (params?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.adminSalesActivities(params),
    queryFn: async () => {
      const response = await adminSalesApi.getSalesActivities(params || {});
      return response;
    },
  });
};

// 営業サマリー用フック
export const useSalesSummaryQuery = (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.adminSalesSummary(params),
    queryFn: async () => {
      const response = await adminSalesApi.getSalesSummary(params);
      return response;
    },
  });
};

// 営業パイプライン用フック
export const useSalesPipelineQuery = () => {
  return useQuery({
    queryKey: queryKeys.adminSalesPipeline,
    queryFn: async () => {
      const response = await adminSalesApi.getSalesPipeline();
      return response;
    },
  });
};

// 契約延長対象用フック
export const useExtensionTargetsQuery = () => {
  return useQuery({
    queryKey: queryKeys.adminExtensionTargets,
    queryFn: async () => {
      const response = await adminSalesApi.getExtensionTargets();
      return response;
    },
  });
};

// 営業目標用フック
export const useSalesTargetsQuery = () => {
  return useQuery({
    queryKey: queryKeys.adminSalesTargets,
    queryFn: async () => {
      const response = await adminSalesApi.getSalesTargets();
      return response;
    },
  });
};

// 営業活動作成ミューテーション
export const useCreateSalesActivity = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (data: SalesActivityCreateRequest) => {
      const response = await adminSalesApi.createSalesActivity(data);
      return response.activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSalesActivities() });
      showToast('営業活動を登録しました', 'success');
    },
    onError: () => {
      showToast('営業活動の登録に失敗しました', 'error');
    },
  });
};

// 営業活動更新ミューテーション
export const useUpdateSalesActivity = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SalesActivityUpdateRequest }) => {
      const response = await adminSalesApi.updateSalesActivity(id, data);
      return response.activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSalesActivities() });
      showToast('営業活動を更新しました', 'success');
    },
    onError: () => {
      showToast('営業活動の更新に失敗しました', 'error');
    },
  });
};

// 営業活動削除ミューテーション
export const useDeleteSalesActivity = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await adminSalesApi.deleteSalesActivity(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSalesActivities() });
      showToast('営業活動を削除しました', 'success');
    },
    onError: () => {
      showToast('営業活動の削除に失敗しました', 'error');
    },
  });
};

// 互換性のためのフック
export const useSalesActivities = (initialParams?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) => {
  const [params, setParams] = React.useState(initialParams || { page: PAGINATION.DEFAULT_PAGE, limit: PAGINATION.DEFAULT_SIZES.SALES_ACTIVITIES });
  const { data, isLoading, error, refetch } = useSalesActivitiesQuery(params);

  const updateParams = (newParams: Partial<typeof params>) => {
    setParams({ ...params, ...newParams });
  };

  return {
    activities: data?.activities || [],
    total: data?.total || 0,
    loading: isLoading,
    error,
    params,
    updateParams,
    refresh: () => refetch(),
  };
};

export const useSalesSummary = (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  const { data, isLoading, error, refetch } = useSalesSummaryQuery(params);

  return {
    summary: data?.summary || null,
    loading: isLoading,
    error,
    refresh: () => refetch(),
  };
};

export const useSalesPipeline = () => {
  const { data, isLoading, error, refetch } = useSalesPipelineQuery();

  return {
    pipeline: data?.pipeline || [],
    loading: isLoading,
    error,
    refresh: () => refetch(),
  };
};

export const useExtensionTargets = () => {
  const { data, isLoading, error, refetch } = useExtensionTargetsQuery();

  return {
    targets: data?.targets || [],
    loading: isLoading,
    error,
    refresh: () => refetch(),
  };
};

export const useSalesTargets = () => {
  const { data, isLoading, error, refetch } = useSalesTargetsQuery();

  return {
    targets: data?.targets || [],
    loading: isLoading,
    error,
    refresh: () => refetch(),
  };
};

export const useSalesActivityForm = () => {
  const createActivity = useCreateSalesActivity();
  const updateActivity = useUpdateSalesActivity();
  const deleteActivity = useDeleteSalesActivity();

  return {
    createActivity: (data: SalesActivityCreateRequest) => createActivity.mutateAsync(data),
    updateActivity: (id: string, data: SalesActivityUpdateRequest) => 
      updateActivity.mutateAsync({ id, data }),
    deleteActivity: (id: string) => deleteActivity.mutateAsync(id),
    submitting: createActivity.isPending || updateActivity.isPending || deleteActivity.isPending,
  };
};