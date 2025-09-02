// Migrated to new API client system
import { useQuery } from '@tanstack/react-query';
import { createPresetApiClient } from '@/lib/api';
import type { MonthlySummaryDTO } from '@/types/admin/weeklyReport';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { CACHE_STRATEGIES, QUERY_KEYS } from '@/constants/cache';

interface UseMonthlySummaryParams {
  year: number;
  month: number;
  departmentId?: string;
}

interface MonthlySummaryResponse {
  summary: MonthlySummaryDTO;
}

/**
 * 月次サマリーデータを取得するカスタムフック
 */
export const useMonthlySummary = ({ year, month, departmentId }: UseMonthlySummaryParams) => {
  const { handleSubmissionError } = useErrorHandler();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<MonthlySummaryResponse>({
    queryKey: [...QUERY_KEYS.MONTHLY_SUMMARY, year, month, departmentId],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          year: year.toString(),
          month: month.toString(),
        });

        if (departmentId) {
          params.append('department_id', departmentId);
        }

        const apiClient = createPresetApiClient('admin');
        const response = await apiClient.get<MonthlySummaryResponse>(
          `/weekly-reports/monthly-summary?${params.toString()}`
        );

        return response.data;
      } catch (error) {
        handleSubmissionError(error, '月次サマリーの取得');
        throw error;
      }
    },
    enabled: !!year && !!month && month >= 1 && month <= 12,
    staleTime: CACHE_STRATEGIES.MONTHLY_SUMMARY.staleTime, // 15分間キャッシュ（集計データなので長め）
    gcTime: CACHE_STRATEGIES.MONTHLY_SUMMARY.gcTime, // 30分間メモリに保持
    refetchOnWindowFocus: false, // 集計データなのでフォーカス時は再取得しない
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    summary: data?.summary,
    isLoading,
    isError,
    error,
    refetch,
  };
};

/**
 * 月次サマリーの前月比較データを取得するカスタムフック
 */
export const useMonthlySummaryComparison = ({ year, month, departmentId }: UseMonthlySummaryParams) => {
  const { handleSubmissionError } = useErrorHandler();

  // 前月の年月を計算
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;

  const currentMonthQuery = useMonthlySummary({ year, month, departmentId });
  const previousMonthQuery = useMonthlySummary({ 
    year: previousYear, 
    month: previousMonth, 
    departmentId 
  });

  return {
    currentMonth: currentMonthQuery.summary,
    previousMonth: previousMonthQuery.summary,
    isLoading: currentMonthQuery.isLoading || previousMonthQuery.isLoading,
    isError: currentMonthQuery.isError || previousMonthQuery.isError,
    error: currentMonthQuery.error || previousMonthQuery.error,
    refetch: () => {
      currentMonthQuery.refetch();
      previousMonthQuery.refetch();
    },
  };
};

/**
 * 月次サマリーのエクスポート処理を行うカスタムフック
 */
export const useMonthlySummaryExport = () => {
  const { handleSubmissionError } = useErrorHandler();

  const exportMonthlySummary = async (year: number, month: number, format: 'csv' = 'csv') => {
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
        format,
      });

      const response = await apiClient.get(
        `/admin/weekly-reports/export?${params.toString()}`,
        {
          responseType: 'blob',
        }
      );

      // ダウンロード処理
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // ファイル名を生成
      const filename = `monthly_summary_${year}_${month.toString().padStart(2, '0')}.csv`;
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      handleSubmissionError(error, 'エクスポート');
      return false;
    }
  };

  return {
    exportMonthlySummary,
  };
};
