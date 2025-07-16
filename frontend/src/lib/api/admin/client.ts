import { adminGet, adminPost, adminPut, adminDelete } from './index';
import { 
  ClientListResponse,
  ClientDetailResponse,
  ClientCreateRequest,
  ClientUpdateRequest,
  ClientProjectsResponse
} from '@/types/admin/client';

export const adminClientApi = {
  /**
   * 取引先一覧を取得
   */
  getClients: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<ClientListResponse> => {
    return adminGet<ClientListResponse>('/business/clients', params);
  },

  /**
   * 取引先詳細を取得
   */
  getClient: async (id: string): Promise<ClientDetailResponse> => {
    return adminGet<ClientDetailResponse>(`/business/clients/${id}`);
  },

  /**
   * 取引先を作成
   */
  createClient: async (data: ClientCreateRequest): Promise<ClientDetailResponse> => {
    return adminPost<ClientDetailResponse>('/business/clients', data);
  },

  /**
   * 取引先を更新
   */
  updateClient: async (id: string, data: ClientUpdateRequest): Promise<ClientDetailResponse> => {
    return adminPut<ClientDetailResponse>(`/business/clients/${id}`, data);
  },

  /**
   * 取引先を削除
   */
  deleteClient: async (id: string): Promise<void> => {
    return adminDelete<void>(`/business/clients/${id}`);
  },

  /**
   * 取引先のプロジェクト一覧を取得
   */
  getClientProjects: async (id: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ClientProjectsResponse> => {
    return adminGet<ClientProjectsResponse>(`/business/clients/${id}/projects`, params);
  },
};