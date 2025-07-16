import { useState, useEffect, useCallback } from 'react';
import { adminWeeklyReportApi } from '@/lib/api/admin/weeklyReport';
import { 
  AdminWeeklyReport,
  AdminWeeklyReportDetail,
  MonthlyAttendance,
  FollowUpUser 
} from '@/types/admin/weeklyReport';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { useToast } from '@/components/common/Toast';

// 週報一覧用フック
export const useWeeklyReports = (initialParams?: {
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const [reports, setReports] = useState<AdminWeeklyReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [params, setParams] = useState(initialParams || {});
  const { handleError } = useErrorHandler();

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminWeeklyReportApi.getWeeklyReports(params);
      setReports(response.reports);
      setTotal(response.total);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [params, handleError]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateParams = (newParams: Partial<typeof params>) => {
    setParams({ ...params, ...newParams });
  };

  return {
    reports,
    total,
    loading,
    error,
    params,
    updateParams,
    refresh: fetchReports,
  };
};

// 週報詳細用フック
export const useWeeklyReportDetail = (id: string) => {
  const [report, setReport] = useState<AdminWeeklyReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const fetchReport = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await adminWeeklyReportApi.getWeeklyReportDetail(id);
      setReport(response.report);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [id, handleError]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const addComment = async (comment: string) => {
    try {
      await adminWeeklyReportApi.commentWeeklyReport(id, { comment });
      showToast('コメントを追加しました', 'success');
      // コメント追加後、詳細を再取得
      await fetchReport();
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    }
  };

  return {
    report,
    loading,
    error,
    refresh: fetchReport,
    addComment,
  };
};

// 月次勤怠用フック
export const useMonthlyAttendance = (year: number, month: number, userId?: string) => {
  const [attendance, setAttendance] = useState<MonthlyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminWeeklyReportApi.getMonthlyAttendance({
        year,
        month,
        user_id: userId,
      });
      setAttendance(response.attendance);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [year, month, userId, handleError]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  return {
    attendance,
    loading,
    error,
    refresh: fetchAttendance,
  };
};

// フォローアップ対象者用フック
export const useFollowUpRequiredUsers = () => {
  const [users, setUsers] = useState<FollowUpUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminWeeklyReportApi.getFollowUpRequiredUsers();
      setUsers(response.users);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refresh: fetchUsers,
  };
};

// エクスポート用フック
export const useWeeklyReportExport = () => {
  const [exporting, setExporting] = useState(false);
  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const exportReport = async (year: number, month: number, format: 'csv' | 'excel', userIds?: string[]) => {
    try {
      setExporting(true);
      await adminWeeklyReportApi.exportMonthlyReport({
        year,
        month,
        format,
        user_ids: userIds,
      });
      showToast(`月次レポートを${format.toUpperCase()}形式でダウンロードしました`, 'success');
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    } finally {
      setExporting(false);
    }
  };

  return {
    exportReport,
    exporting,
  };
};