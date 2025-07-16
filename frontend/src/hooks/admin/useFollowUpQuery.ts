import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFollowUpApi } from '@/lib/api/admin/followUp';
import { queryKeys } from '@/lib/tanstack-query';
import { FollowUpUser } from '@/types/admin/followUp';
import { useToast } from '@/components/common/Toast';
import React from 'react';
import { PAGINATION } from '@/constants/pagination';

// フォローアップユーザー一覧用フック
export const useFollowUpUsersQuery = (params?: {
  page?: number;
  limit?: number;
  type?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.adminFollowUpUsers(params),
    queryFn: async () => {
      const response = await adminFollowUpApi.getFollowUpUsers(params || {});
      return response;
    },
    // 30秒ごとに自動更新
    refetchInterval: 30000,
  });
};

// フォローアップマークミューテーション
export const useMarkAsFollowedUp = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, followUpDate }: { userId: string; followUpDate: string }) => {
      const response = await adminFollowUpApi.markAsFollowedUp(userId, followUpDate);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminFollowUpUsers() });
      showToast('フォローアップを記録しました', 'success');
    },
    onError: () => {
      showToast('フォローアップの記録に失敗しました', 'error');
    },
  });
};

// 互換性のためのフック
export const useFollowUpUsers = (initialParams?: {
  page?: number;
  limit?: number;
  type?: string;
}) => {
  const [params, setParams] = React.useState(initialParams || { page: PAGINATION.DEFAULT_PAGE, limit: PAGINATION.DEFAULT_SIZES.ENGINEERS });
  const { data, isLoading, error, refetch } = useFollowUpUsersQuery(params);

  const updateParams = (newParams: Partial<typeof params>) => {
    setParams({ ...params, ...newParams });
  };

  return {
    users: data?.users || [],
    total: data?.total || 0,
    loading: isLoading,
    error,
    params,
    updateParams,
    refresh: () => refetch(),
  };
};

export const useFollowUp = () => {
  const markAsFollowedUp = useMarkAsFollowedUp();

  return {
    markAsFollowedUp: (userId: string, followUpDate: string) => 
      markAsFollowedUp.mutateAsync({ userId, followUpDate }),
    submitting: markAsFollowedUp.isPending,
  };
};