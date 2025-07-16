import { useState, useEffect, useCallback } from 'react';
import { adminSalesApi } from '@/lib/api/admin/sales';
import { 
  SalesActivity,
  SalesPipeline,
  SalesSummary,
  ExtensionTarget,
  SalesTarget,
  SalesActivityCreateRequest,
  SalesActivityUpdateRequest
} from '@/types/admin/sales';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { useToast } from '@/components/common/Toast';

// 営業活動一覧用フック
export const useSalesActivities = (initialParams?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) => {
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [params, setParams] = useState(initialParams || { page: 1, limit: 20 });
  const { handleError } = useErrorHandler();

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminSalesApi.getSalesActivities(params);
      setActivities(response.activities);
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
    fetchActivities();
  }, [fetchActivities]);

  const updateParams = (newParams: Partial<typeof params>) => {
    setParams({ ...params, ...newParams });
  };

  return {
    activities,
    total,
    loading,
    error,
    params,
    updateParams,
    refresh: fetchActivities,
  };
};

// 営業サマリー用フック
export const useSalesSummary = (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminSalesApi.getSalesSummary(params);
      setSummary(response.summary);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [params, handleError]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refresh: fetchSummary,
  };
};

// 営業パイプライン用フック
export const useSalesPipeline = () => {
  const [pipeline, setPipeline] = useState<SalesPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminSalesApi.getSalesPipeline();
      setPipeline(response.pipeline);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  return {
    pipeline,
    loading,
    error,
    refresh: fetchPipeline,
  };
};

// 契約延長対象用フック
export const useExtensionTargets = () => {
  const [targets, setTargets] = useState<ExtensionTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminSalesApi.getExtensionTargets();
      setTargets(response.targets);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  return {
    targets,
    loading,
    error,
    refresh: fetchTargets,
  };
};

// 営業目標用フック
export const useSalesTargets = () => {
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminSalesApi.getSalesTargets();
      setTargets(response.targets);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  return {
    targets,
    loading,
    error,
    refresh: fetchTargets,
  };
};

// 営業活動フォーム用フック
export const useSalesActivityForm = () => {
  const [submitting, setSubmitting] = useState(false);
  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const createActivity = async (data: SalesActivityCreateRequest) => {
    try {
      setSubmitting(true);
      const response = await adminSalesApi.createSalesActivity(data);
      showToast('営業活動を登録しました', 'success');
      return response.activity;
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const updateActivity = async (id: string, data: SalesActivityUpdateRequest) => {
    try {
      setSubmitting(true);
      const response = await adminSalesApi.updateSalesActivity(id, data);
      showToast('営業活動を更新しました', 'success');
      return response.activity;
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      setSubmitting(true);
      await adminSalesApi.deleteSalesActivity(id);
      showToast('営業活動を削除しました', 'success');
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    createActivity,
    updateActivity,
    deleteActivity,
    submitting,
  };
};