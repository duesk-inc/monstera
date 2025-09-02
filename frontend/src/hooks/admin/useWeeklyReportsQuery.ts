import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { adminWeeklyReportApi } from '@/lib/api/admin/weeklyReport';
import { queryKeys } from '@/lib/tanstack-query';
import { AdminWeeklyReport, AdminWeeklyReportDetail } from '@/types/admin/weeklyReport';
import { PAGINATION } from '@/constants/pagination';

// 互換性のための型定義
type WeeklyReport = AdminWeeklyReport;
type WeeklyReportDetail = AdminWeeklyReportDetail;
type CommentCreateRequest = { comment: string };
import { useToast } from '@/components/common/Toast';

// 週報一覧取得用フック
export const useWeeklyReportsQuery = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.adminWeeklyReports(params),
    queryFn: async () => {
      const response = await adminWeeklyReportApi.getWeeklyReports(params || {});
      return response;
    },
  });
};

// 週報詳細取得用フック
export const useWeeklyReportDetailQuery = (reportId: string) => {
  return useQuery({
    queryKey: queryKeys.adminWeeklyReportDetail(reportId),
    queryFn: async () => {
      const response = await adminWeeklyReportApi.getWeeklyReport(reportId);
      return response.report;
    },
    enabled: !!reportId,
  });
};

// 週報承認用ミューテーション
export const useApproveWeeklyReport = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await adminWeeklyReportApi.approveWeeklyReport(reportId);
      return response.report;
    },
    onSuccess: (data, reportId) => {
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: queryKeys.adminWeeklyReports() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminWeeklyReportDetail(reportId) });
      showToast('週報を承認しました', 'success');
    },
    onError: () => {
      showToast('承認に失敗しました', 'error');
    },
  });
};

// 週報却下用ミューテーション
export const useRejectWeeklyReport = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ reportId, reason }: { reportId: string; reason: string }) => {
      const response = await adminWeeklyReportApi.rejectWeeklyReport(reportId, reason);
      return response.report;
    },
    onSuccess: (data, variables) => {
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: queryKeys.adminWeeklyReports() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminWeeklyReportDetail(variables.reportId) });
      showToast('週報を差戻しました', 'success');
    },
    onError: () => {
      showToast('差戻しに失敗しました', 'error');
    },
  });
};

// コメント追加用ミューテーション
export const useAddComment = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ reportId, data }: { reportId: string; data: CommentCreateRequest }) => {
      const response = await adminWeeklyReportApi.addComment(reportId, data);
      return response.comment;
    },
    onSuccess: (data, variables) => {
      // 週報詳細のキャッシュを更新
      queryClient.invalidateQueries({ queryKey: queryKeys.adminWeeklyReportDetail(variables.reportId) });
      showToast('コメントを追加しました', 'success');
    },
    onError: () => {
      showToast('コメントの追加に失敗しました', 'error');
    },
  });
};

// エクスポート用ミューテーション
export const useExportWeeklyReports = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      format: 'csv'; // Excelは初期スコープ外
      status?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      await adminWeeklyReportApi.exportWeeklyReports(params);
    },
    onSuccess: () => {
      showToast('エクスポートを開始しました', 'success');
    },
    onError: () => {
      showToast('エクスポートに失敗しました', 'error');
    },
  });
};

// 互換性のためのフック（既存のコードで使用）
export const useWeeklyReports = (initialParams?: {
  page?: number;
  limit?: number;
  status?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}) => {
  const [params, setParams] = React.useState(initialParams || { page: PAGINATION.DEFAULT_PAGE, limit: PAGINATION.DEFAULT_SIZES.WEEKLY_REPORTS });
  const { data, isLoading, error, refetch } = useWeeklyReportsQuery(params);

  const updateParams = (newParams: Partial<typeof params>) => {
    setParams({ ...params, ...newParams });
  };

  return {
    reports: data?.reports || [],
    total: data?.total || 0,
    loading: isLoading,
    error,
    params,
    updateParams,
    refresh: () => refetch(),
  };
};

// useWeeklyReportFormの互換性フック
export const useWeeklyReportForm = () => {
  const approveReport = useApproveWeeklyReport();
  const rejectReport = useRejectWeeklyReport();
  const addComment = useAddComment();

  return {
    approveReport: (reportId: string) => approveReport.mutateAsync(reportId),
    rejectReport: (reportId: string, reason: string) => 
      rejectReport.mutateAsync({ reportId, reason }),
    addComment: (reportId: string, data: CommentCreateRequest) => 
      addComment.mutateAsync({ reportId, data }),
    submitting: approveReport.isPending || rejectReport.isPending || addComment.isPending,
  };
};
