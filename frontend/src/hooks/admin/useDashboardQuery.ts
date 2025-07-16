import { useQuery } from '@tanstack/react-query';
import { adminDashboardApi } from '@/lib/api/admin/dashboard';
import { queryKeys } from '@/lib/tanstack-query';
import { AdminDashboardData } from '@/types/admin/dashboard';

// ダッシュボードデータ取得用のReact Queryフック
export const useDashboardQuery = () => {
  return useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: async () => {
      const response = await adminDashboardApi.getDashboardData();
      return response;
    },
    // 1分ごとに自動更新
    refetchInterval: 60000,
    // エラー時は1回だけリトライ
    retry: 1,
  });
};

// ダッシュボードアクション用のフック（互換性のため維持）
export const useDashboard = () => {
  const { data, isLoading, error, refetch } = useDashboardQuery();

  return {
    data,
    loading: isLoading,
    error,
    refresh: () => refetch(),
  };
};