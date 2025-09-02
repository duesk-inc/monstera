import { useState, useEffect, useCallback } from 'react';
import { adminInvoiceApi } from '@/lib/api/admin/invoice';
import { 
  Invoice, 
  InvoiceDetail, 
  InvoiceSummary,
  InvoiceCreateRequest,
  InvoiceUpdateRequest,
  InvoiceStatusUpdateRequest 
} from '@/types/admin/invoice';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { useToast } from '@/components/common/Toast';

// 請求書一覧用フック
export const useInvoices = (initialParams?: {
  page?: number;
  limit?: number;
  status?: string;
  client_id?: string;
  start_date?: string;
  end_date?: string;
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [params, setParams] = useState(initialParams || { page: 1, limit: 20 });
  const { handleError } = useErrorHandler();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminInvoiceApi.getInvoices(params);
      setInvoices(response.invoices);
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
    fetchInvoices();
  }, [fetchInvoices]);

  const updateParams = (newParams: Partial<typeof params>) => {
    setParams({ ...params, ...newParams });
  };

  return {
    invoices,
    total,
    loading,
    error,
    params,
    updateParams,
    refresh: fetchInvoices,
  };
};

// 請求書サマリー用フック
export const useInvoiceSummary = (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminInvoiceApi.getInvoiceSummary(params);
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

// 請求書詳細用フック
export const useInvoiceDetail = (id: string) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await adminInvoiceApi.getInvoice(id);
      setInvoice(response.invoice);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [id, handleError]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const updateInvoice = async (data: InvoiceUpdateRequest) => {
    try {
      const response = await adminInvoiceApi.updateInvoice(id, data);
      setInvoice(response.invoice);
      showToast('請求書を更新しました', 'success');
      return response.invoice;
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    }
  };

  const updateStatus = async (data: InvoiceStatusUpdateRequest) => {
    try {
      const response = await adminInvoiceApi.updateInvoiceStatus(id, data);
      setInvoice(response.invoice);
      showToast('ステータスを更新しました', 'success');
      return response.invoice;
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    }
  };

  return {
    invoice,
    loading,
    error,
    refresh: fetchInvoice,
    updateInvoice,
    updateStatus,
  };
};

// 請求書作成・編集用フック
export const useInvoiceForm = () => {
  const [submitting, setSubmitting] = useState(false);
  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const createInvoice = async (data: InvoiceCreateRequest) => {
    try {
      setSubmitting(true);
      const response = await adminInvoiceApi.createInvoice(data);
      showToast('請求書を作成しました', 'success');
      return response.invoice;
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const updateInvoice = async (id: string, data: InvoiceUpdateRequest) => {
    try {
      setSubmitting(true);
      const response = await adminInvoiceApi.updateInvoice(id, data);
      showToast('請求書を更新しました', 'success');
      return response.invoice;
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      setSubmitting(true);
      await adminInvoiceApi.deleteInvoice(id);
      showToast('請求書を削除しました', 'success');
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    submitting,
  };
};
