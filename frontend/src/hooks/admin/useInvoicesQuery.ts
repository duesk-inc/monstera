import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminInvoiceApi } from '@/lib/api/admin/invoice';
import { queryKeys } from '@/lib/tanstack-query';
import { 
  Invoice, 
  InvoiceDetail, 
  InvoiceSummary,
  InvoiceCreateRequest,
  InvoiceUpdateRequest,
  InvoiceStatusUpdateRequest 
} from '@/types/admin/invoice';
import { useToast } from '@/components/common/Toast';
import React from 'react';
import { PAGINATION } from '@/constants/pagination';

// 請求書一覧用フック
export const useInvoicesQuery = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  client_id?: string;
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.adminInvoices(params),
    queryFn: async () => {
      const response = await adminInvoiceApi.getInvoices(params || {});
      return response;
    },
  });
};

// 請求書サマリー用フック
export const useInvoiceSummaryQuery = (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.adminInvoiceSummary(params),
    queryFn: async () => {
      const response = await adminInvoiceApi.getInvoiceSummary(params);
      return response;
    },
  });
};

// 請求書詳細用フック
export const useInvoiceDetailQuery = (id: string) => {
  return useQuery({
    queryKey: queryKeys.adminInvoiceDetail(id),
    queryFn: async () => {
      const response = await adminInvoiceApi.getInvoice(id);
      return response.invoice;
    },
    enabled: !!id,
  });
};

// 請求書作成ミューテーション
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (data: InvoiceCreateRequest) => {
      const response = await adminInvoiceApi.createInvoice(data);
      return response.invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoiceSummary() });
      showToast('請求書を作成しました', 'success');
    },
    onError: () => {
      showToast('請求書の作成に失敗しました', 'error');
    },
  });
};

// 請求書更新ミューテーション
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InvoiceUpdateRequest }) => {
      const response = await adminInvoiceApi.updateInvoice(id, data);
      return response.invoice;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoiceDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoiceSummary() });
      showToast('請求書を更新しました', 'success');
    },
    onError: () => {
      showToast('請求書の更新に失敗しました', 'error');
    },
  });
};

// 請求書ステータス更新ミューテーション
export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InvoiceStatusUpdateRequest }) => {
      const response = await adminInvoiceApi.updateInvoiceStatus(id, data);
      return response.invoice;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoiceDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoiceSummary() });
      showToast('ステータスを更新しました', 'success');
    },
    onError: () => {
      showToast('ステータスの更新に失敗しました', 'error');
    },
  });
};

// 請求書削除ミューテーション
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await adminInvoiceApi.deleteInvoice(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoices() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoiceSummary() });
      showToast('請求書を削除しました', 'success');
    },
    onError: () => {
      showToast('請求書の削除に失敗しました', 'error');
    },
  });
};

// PDF出力ミューテーション
export const useExportInvoicePDF = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await adminInvoiceApi.exportInvoicePDF(id);
    },
    onSuccess: () => {
      showToast('PDFをダウンロードしました', 'success');
    },
    onError: () => {
      showToast('PDFのダウンロードに失敗しました', 'error');
    },
  });
};

// 互換性のためのフック
export const useInvoices = (initialParams?: {
  page?: number;
  limit?: number;
  status?: string;
  client_id?: string;
  start_date?: string;
  end_date?: string;
}) => {
  const [params, setParams] = React.useState(initialParams || { page: PAGINATION.DEFAULT_PAGE, limit: PAGINATION.DEFAULT_SIZES.INVOICES });
  const { data, isLoading, error, refetch } = useInvoicesQuery(params);

  const updateParams = (newParams: Partial<typeof params>) => {
    setParams({ ...params, ...newParams });
  };

  return {
    invoices: data?.invoices || [],
    total: data?.total || 0,
    loading: isLoading,
    error,
    params,
    updateParams,
    refresh: () => refetch(),
  };
};

export const useInvoiceSummary = (params?: {
  start_date?: string;
  end_date?: string;
}) => {
  const { data, isLoading, error, refetch } = useInvoiceSummaryQuery(params);

  return {
    summary: data?.summary || null,
    loading: isLoading,
    error,
    refresh: () => refetch(),
  };
};

export const useInvoiceDetail = (id: string) => {
  const { data: invoice, isLoading: loading, error, refetch } = useInvoiceDetailQuery(id);
  const updateInvoice = useUpdateInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const exportPDF = useExportInvoicePDF();

  return {
    invoice,
    loading,
    error,
    refresh: () => refetch(),
    updateInvoice: (data: InvoiceUpdateRequest) => updateInvoice.mutateAsync({ id, data }),
    updateStatus: (data: InvoiceStatusUpdateRequest) => updateStatus.mutateAsync({ id, data }),
    exportPDF: () => exportPDF.mutateAsync(id),
  };
};

export const useInvoiceForm = () => {
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  return {
    createInvoice: (data: InvoiceCreateRequest) => createInvoice.mutateAsync(data),
    updateInvoice: (id: string, data: InvoiceUpdateRequest) => 
      updateInvoice.mutateAsync({ id, data }),
    deleteInvoice: (id: string) => deleteInvoice.mutateAsync(id),
    submitting: createInvoice.isPending || updateInvoice.isPending || deleteInvoice.isPending,
  };
};