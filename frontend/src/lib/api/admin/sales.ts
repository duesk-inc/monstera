import { adminGet, adminPost, adminPut, adminDelete } from './index';
import { 
  SalesActivityListResponse,
  SalesActivityDetailResponse,
  SalesActivityCreateRequest,
  SalesActivityUpdateRequest,
  SalesSummaryResponse,
  SalesPipelineResponse,
  ExtensionTargetsResponse,
  SalesTargetsResponse
} from '@/types/admin/sales';

export const adminSalesApi = {
  /**
   * 営業活動一覧を取得
   */
  getSalesActivities: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<SalesActivityListResponse> => {
    return adminGet<SalesActivityListResponse>('/sales/activities', params);
  },

  /**
   * 営業活動サマリーを取得
   */
  getSalesSummary: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<SalesSummaryResponse> => {
    return adminGet<SalesSummaryResponse>('/sales/activities/summary', params);
  },

  /**
   * 営業活動詳細を取得
   */
  getSalesActivity: async (id: string): Promise<SalesActivityDetailResponse> => {
    return adminGet<SalesActivityDetailResponse>(`/sales/activities/${id}`);
  },

  /**
   * 営業活動を作成
   */
  createSalesActivity: async (data: SalesActivityCreateRequest): Promise<SalesActivityDetailResponse> => {
    return adminPost<SalesActivityDetailResponse>('/sales/activities', data);
  },

  /**
   * 営業活動を更新
   */
  updateSalesActivity: async (id: string, data: SalesActivityUpdateRequest): Promise<SalesActivityDetailResponse> => {
    return adminPut<SalesActivityDetailResponse>(`/sales/activities/${id}`, data);
  },

  /**
   * 営業活動を削除
   */
  deleteSalesActivity: async (id: string): Promise<void> => {
    return adminDelete<void>(`/sales/activities/${id}`);
  },

  /**
   * 営業パイプラインを取得
   */
  getSalesPipeline: async (): Promise<SalesPipelineResponse> => {
    return adminGet<SalesPipelineResponse>('/sales/pipeline');
  },

  /**
   * 契約延長対象を取得
   */
  getExtensionTargets: async (): Promise<ExtensionTargetsResponse> => {
    return adminGet<ExtensionTargetsResponse>('/sales/pipeline/extension-targets');
  },

  /**
   * 営業目標を取得
   */
  getSalesTargets: async (): Promise<SalesTargetsResponse> => {
    return adminGet<SalesTargetsResponse>('/sales/pipeline/targets');
  },
};