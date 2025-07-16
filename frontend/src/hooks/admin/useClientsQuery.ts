import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClientApi } from '@/lib/api/admin/client';
import { queryKeys } from '@/lib/tanstack-query';
import { 
  Client, 
  ClientDetail,
  ClientCreateRequest,
  ClientUpdateRequest 
} from '@/types/admin/client';
import { useToast } from '@/components/common/Toast';
import { PAGINATION } from '@/constants/pagination';
import React from 'react';

// 取引先一覧用フック
export const useClientsQuery = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.adminClients(params),
    queryFn: async () => {
      const response = await adminClientApi.getClients(params || {});
      return response;
    },
  });
};

// 取引先詳細用フック
export const useClientDetailQuery = (id: string) => {
  return useQuery({
    queryKey: queryKeys.adminClientDetail(id),
    queryFn: async () => {
      const response = await adminClientApi.getClient(id);
      return response.client;
    },
    enabled: !!id,
  });
};

// 取引先作成ミューテーション
export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (data: ClientCreateRequest) => {
      const response = await adminClientApi.createClient(data);
      return response.client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminClients() });
      showToast('取引先を登録しました', 'success');
    },
    onError: () => {
      showToast('取引先の登録に失敗しました', 'error');
    },
  });
};

// 取引先更新ミューテーション
export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClientUpdateRequest }) => {
      const response = await adminClientApi.updateClient(id, data);
      return response.client;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminClients() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminClientDetail(variables.id) });
      showToast('取引先を更新しました', 'success');
    },
    onError: () => {
      showToast('取引先の更新に失敗しました', 'error');
    },
  });
};

// 取引先削除ミューテーション
export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await adminClientApi.deleteClient(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminClients() });
      showToast('取引先を削除しました', 'success');
    },
    onError: () => {
      showToast('取引先の削除に失敗しました', 'error');
    },
  });
};

// 互換性のためのフック
export const useClients = (initialParams?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const [params, setParams] = React.useState(initialParams || { page: PAGINATION.DEFAULT_PAGE, limit: PAGINATION.DEFAULT_SIZES.CLIENTS });
  const { data, isLoading, error, refetch } = useClientsQuery(params);

  const updateParams = (newParams: Partial<typeof params>) => {
    setParams({ ...params, ...newParams });
  };

  return {
    clients: data?.clients || [],
    total: data?.total || 0,
    loading: isLoading,
    error,
    params,
    updateParams,
    refresh: () => refetch(),
  };
};

export const useClientDetail = (id: string) => {
  const { data: client, isLoading: loading, error, refetch } = useClientDetailQuery(id);
  const updateClient = useUpdateClient();

  return {
    client,
    loading,
    error,
    refresh: () => refetch(),
    updateClient: (data: ClientUpdateRequest) => updateClient.mutateAsync({ id, data }),
  };
};

export const useClientForm = () => {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  return {
    createClient: (data: ClientCreateRequest) => createClient.mutateAsync(data),
    updateClient: (id: string, data: ClientUpdateRequest) => 
      updateClient.mutateAsync({ id, data }),
    deleteClient: (id: string) => deleteClient.mutateAsync(id),
    submitting: createClient.isPending || updateClient.isPending || deleteClient.isPending,
  };
};