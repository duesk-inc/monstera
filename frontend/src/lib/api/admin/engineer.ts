import { adminGet, adminPost, adminPut, adminDelete, adminDownload } from './index';
import { 
  Engineer,
  EngineerDetail,
  GetEngineersParams,
  GetEngineersResponse,
  CreateEngineerRequest,
  UpdateEngineerRequest,
  UpdateEngineerStatusRequest,
  ExportOptions,
  ImportResult
} from '@/types/engineer';

export const adminEngineerApi = {
  /**
   * エンジニア一覧を取得
   */
  getEngineers: async (params?: GetEngineersParams): Promise<GetEngineersResponse> => {
    return adminGet<GetEngineersResponse>('/engineers', params);
  },

  /**
   * エンジニア詳細を取得
   */
  getEngineerDetail: async (id: string): Promise<EngineerDetail> => {
    return adminGet<EngineerDetail>(`/engineers/${id}`);
  },

  /**
   * エンジニアを作成
   */
  createEngineer: async (data: CreateEngineerRequest): Promise<Engineer> => {
    return adminPost<Engineer>('/engineers', data);
  },

  /**
   * エンジニア情報を更新
   */
  updateEngineer: async (id: string, data: UpdateEngineerRequest): Promise<Engineer> => {
    return adminPut<Engineer>(`/engineers/${id}`, data);
  },

  /**
   * エンジニアを削除（論理削除）
   */
  deleteEngineer: async (id: string): Promise<{ message: string }> => {
    return adminDelete<{ message: string }>(`/engineers/${id}`);
  },

  /**
   * エンジニアのステータスを更新
   */
  updateEngineerStatus: async (id: string, data: UpdateEngineerStatusRequest): Promise<{ message: string }> => {
    return adminPut<{ message: string }>(`/engineers/${id}/status`, data);
  },

  /**
   * CSVインポート
   */
  importCSV: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return adminPost<ImportResult>('/engineers/import', formData);
  },

  /**
   * CSVエクスポート
   */
  exportCSV: async (options: ExportOptions, filename?: string): Promise<void> => {
    const exportFilename = filename || `engineers_export_${new Date().toISOString().split('T')[0]}.csv`;
    return adminDownload('/engineers/export', exportFilename, options);
  },

  /**
   * CSVテンプレートをダウンロード
   */
  downloadTemplate: async (): Promise<void> => {
    const filename = `engineers_template_${new Date().toISOString().split('T')[0]}.csv`;
    return adminDownload('/engineers/template', filename);
  },

  /**
   * エンジニア統計情報を取得
   */
  getStatistics: async (): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byDepartment: Record<string, number>;
  }> => {
    return adminGet('/engineers/statistics');
  }
};