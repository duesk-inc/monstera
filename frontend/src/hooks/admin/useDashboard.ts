import { useState, useEffect } from 'react';
import { adminDashboardApi } from '@/lib/api/admin/dashboard';
import { AdminDashboardData } from '@/types/admin/dashboard';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';

export const useDashboard = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminDashboardApi.getDashboardData();
      setData(response);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const refresh = () => {
    fetchDashboardData();
  };

  return {
    data,
    loading,
    error,
    refresh,
  };
};