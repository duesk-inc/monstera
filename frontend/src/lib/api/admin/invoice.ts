import { adminGet, adminPost, adminPut, adminDelete, adminDownload } from './index';
import { 
  InvoiceListResponse,
  InvoiceDetailResponse,
  InvoiceCreateRequest,
  InvoiceUpdateRequest,
  InvoiceStatusUpdateRequest,
  InvoiceSummaryResponse
} from '@/types/admin/invoice';

export const adminInvoiceApi = {
  /**
   * 請求書一覧を取得
   */
  getInvoices: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    client_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<InvoiceListResponse> => {
    return adminGet<InvoiceListResponse>('/business/invoices', params);
  },

  /**
   * 請求書サマリーを取得
   */
  getInvoiceSummary: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<InvoiceSummaryResponse> => {
    return adminGet<InvoiceSummaryResponse>('/business/invoices/summary', params);
  },

  /**
   * 請求書詳細を取得
   */
  getInvoice: async (id: string): Promise<InvoiceDetailResponse> => {
    return adminGet<InvoiceDetailResponse>(`/business/invoices/${id}`);
  },

  /**
   * 請求書を作成
   */
  createInvoice: async (data: InvoiceCreateRequest): Promise<InvoiceDetailResponse> => {
    return adminPost<InvoiceDetailResponse>('/business/invoices', data);
  },

  /**
   * 請求書を更新（下書きのみ）
   */
  updateInvoice: async (id: string, data: InvoiceUpdateRequest): Promise<InvoiceDetailResponse> => {
    return adminPut<InvoiceDetailResponse>(`/business/invoices/${id}`, data);
  },

  /**
   * 請求書ステータスを更新
   */
  updateInvoiceStatus: async (id: string, data: InvoiceStatusUpdateRequest): Promise<InvoiceDetailResponse> => {
    return adminPut<InvoiceDetailResponse>(`/business/invoices/${id}/status`, data);
  },

  /**
   * 請求書を削除（下書きのみ）
   */
  deleteInvoice: async (id: string): Promise<void> => {
    return adminDelete<void>(`/business/invoices/${id}`);
  },
};
