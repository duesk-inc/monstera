import axiosInstance from '../axios';
import { convertSnakeToCamel, convertCamelToSnake } from '../../utils/apiUtils';
import { AUTOCOMPLETE } from '../../constants/ui';
import type {
  WorkHistoryData,
  WorkHistoryCreateRequest,
  WorkHistoryUpdateRequest,
  WorkHistoryTempSaveRequest,
  TechnologySuggestionsResponse,
  TechnologySuggestionRequest,
  WorkHistoryPDFGenerateRequest,
  WorkHistoryPDFResponse,
  PDFExportParams,
  ApiResponse,
  WorkHistorySearchParams,
  ITExperience,
  TechnologyCategory,
  Industry,
  Process,
  TechnologyMaster,
} from '../../types/workHistory';

/**
 * 職務経歴APIクライアント（拡張版）
 */
export const workHistoryApi = {
  /**
   * 職務経歴情報を取得
   * @param params 検索パラメータ
   * @returns 職務経歴データ
   */
  async getWorkHistory(params?: WorkHistorySearchParams): Promise<WorkHistoryData> {
    const response = await axiosInstance.get<ApiResponse<WorkHistoryData>>(
      '/api/v1/work-history',
      { params: convertCamelToSnake(params) }
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '職務経歴の取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as WorkHistoryData;
  },

  /**
   * 特定の職務経歴を取得
   * @param id 職務経歴ID
   * @returns 職務経歴データ
   */
  async getWorkHistoryById(id: string): Promise<WorkHistoryData> {
    const response = await axiosInstance.get<ApiResponse<WorkHistoryData>>(
      `/api/v1/work-history/${id}`
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '職務経歴の取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as WorkHistoryData;
  },

  /**
   * 職務経歴を作成
   * @param data 作成データ
   * @returns 作成された職務経歴データ
   */
  async createWorkHistory(data: WorkHistoryCreateRequest): Promise<WorkHistoryData> {
    const response = await axiosInstance.post<ApiResponse<WorkHistoryData>>(
      '/api/v1/work-history',
      convertCamelToSnake(data)
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '職務経歴の作成に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as WorkHistoryData;
  },

  /**
   * 職務経歴情報を更新
   * @param id 職務経歴ID
   * @param data 更新データ
   * @returns 更新後の職務経歴データ
   */
  async updateWorkHistory(id: string, data: WorkHistoryUpdateRequest): Promise<WorkHistoryData> {
    const response = await axiosInstance.put<ApiResponse<WorkHistoryData>>(
      `/api/v1/work-history/${id}`,
      convertCamelToSnake(data)
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '職務経歴の更新に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as WorkHistoryData;
  },

  /**
   * 職務経歴情報を一括更新
   * @param data 更新データ
   * @returns 更新後の職務経歴データ
   */
  async updateAllWorkHistory(data: WorkHistoryUpdateRequest): Promise<WorkHistoryData> {
    const response = await axiosInstance.put<ApiResponse<WorkHistoryData>>(
      '/api/v1/work-history',
      convertCamelToSnake(data)
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '職務経歴の更新に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as WorkHistoryData;
  },

  /**
   * 職務経歴を削除
   * @param id 職務経歴ID
   * @returns 成功メッセージ
   */
  async deleteWorkHistory(id: string): Promise<{ message: string }> {
    const response = await axiosInstance.delete<ApiResponse<{ message: string }>>(
      `/api/v1/work-history/${id}`
    );
    
    return { message: response.data.message || '職務経歴を削除しました' };
  },

  /**
   * 職務経歴情報を一時保存
   * @param data 一時保存データ
   * @returns 成功メッセージ
   */
  async saveTemporary(data: WorkHistoryTempSaveRequest): Promise<{ message: string }> {
    const response = await axiosInstance.post<ApiResponse<{ message: string }>>(
      '/api/v1/work-history/temp-save',
      convertCamelToSnake(data)
    );
    
    return { message: response.data.message || '一時保存しました' };
  },

  /**
   * 一時保存データを取得
   * @returns 一時保存された職務経歴データ
   */
  async getTemporarySave(): Promise<WorkHistoryData | null> {
    try {
      const response = await axiosInstance.get<ApiResponse<WorkHistoryData>>(
        '/api/v1/work-history/temp-save'
      );
      
      if (!response.data.data) {
        return null;
      }
      
      return convertSnakeToCamel(response.data.data) as WorkHistoryData;
    } catch {
      // 一時保存データがない場合は null を返す
      return null;
    }
  },

  /**
   * 一時保存データを削除
   * @returns 成功メッセージ
   */
  async deleteTemporarySave(): Promise<{ message: string }> {
    const response = await axiosInstance.delete<ApiResponse<{ message: string }>>(
      '/api/v1/work-history/temp-save'
    );
    
    return { message: response.data.message || '一時保存データを削除しました' };
  },

  /**
   * 技術名の候補を取得
   * @param params 検索パラメータ
   * @returns 技術名候補のリスト
   */
  async getTechnologySuggestions(params: TechnologySuggestionRequest): Promise<TechnologySuggestionsResponse> {
    const response = await axiosInstance.get<ApiResponse<TechnologySuggestionsResponse>>(
      '/api/v1/work-history/technology-suggestions',
      {
        params: convertCamelToSnake(params),
      }
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '技術候補の取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as TechnologySuggestionsResponse;
  },

  /**
   * 人気技術一覧を取得
   * @param limit 取得件数
   * @returns 人気技術リスト
   */
  async getPopularTechnologies(limit = AUTOCOMPLETE.DISPLAY_LIMIT): Promise<TechnologySuggestionsResponse> {
    const response = await axiosInstance.get<ApiResponse<TechnologySuggestionsResponse>>(
      '/api/v1/work-history/popular-technologies',
      { params: { limit } }
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '人気技術の取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as TechnologySuggestionsResponse;
  },

  /**
   * 技術カテゴリ一覧を取得
   * @returns 技術カテゴリリスト
   */
  async getTechnologyCategories(): Promise<TechnologyCategory[]> {
    const response = await axiosInstance.get<ApiResponse<TechnologyCategory[]>>(
      '/api/v1/work-history/technology-categories'
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '技術カテゴリの取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as TechnologyCategory[];
  },

  /**
   * 職務経歴書PDFを生成・ダウンロード
   * @param params PDFエクスポートパラメータ
   * @returns Blobデータとファイル名
   */
  async downloadPDF(params?: PDFExportParams): Promise<{ blob: Blob; fileName: string }> {
    const response = await axiosInstance.get('/api/v1/work-history/pdf', {
      params: convertCamelToSnake(params),
      responseType: 'blob',
    });

    // Content-Dispositionヘッダーからファイル名を取得
    const contentDisposition = response.headers['content-disposition'];
    let fileName = '職務経歴書.pdf';
    
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename\*?=['"]?([^'"\s]+)['"]?/);
      if (fileNameMatch && fileNameMatch[1]) {
        // RFC 5987形式のデコード
        if (fileNameMatch[1].includes("''")) {
          const [encoding, , encodedName] = fileNameMatch[1].split("'");
          if (encoding.toLowerCase() === 'utf-8') {
            fileName = decodeURIComponent(encodedName);
          }
        } else {
          fileName = fileNameMatch[1];
        }
      }
    }

    return {
      blob: response.data,
      fileName,
    };
  },

  /**
   * PDF生成リクエスト（非同期）
   * @param params PDF生成パラメータ
   * @returns PDF生成レスポンス
   */
  async generatePDF(params: WorkHistoryPDFGenerateRequest): Promise<WorkHistoryPDFResponse> {
    const response = await axiosInstance.post<ApiResponse<WorkHistoryPDFResponse>>(
      '/api/v1/work-history/pdf',
      convertCamelToSnake(params)
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || 'PDF生成に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as WorkHistoryPDFResponse;
  },

  /**
   * IT経験年数を取得
   * @param userId ユーザーID（任意）
   * @returns IT経験年数情報
   */
  async getITExperience(userId?: string): Promise<ITExperience> {
    const response = await axiosInstance.get<ApiResponse<ITExperience>>(
      '/api/v1/work-history/it-experience',
      { params: userId ? { user_id: userId } : undefined }
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || 'IT経験年数の取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as ITExperience;
  },

  /**
   * 技術スキル一覧を取得
   * @param userId ユーザーID（任意）
   * @returns 技術スキルリスト
   */
  async getTechnologySkills(userId?: string): Promise<unknown[]> {
    const response = await axiosInstance.get<ApiResponse<unknown[]>>(
      '/api/v1/work-history/technology-skills',
      { params: userId ? { user_id: userId } : undefined }
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '技術スキルの取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as unknown[];
  },

  /**
   * ユーザーサマリー情報を取得
   * @param userId ユーザーID（任意）
   * @returns サマリー情報
   */
  async getSummary(userId?: string): Promise<unknown> {
    const response = await axiosInstance.get<ApiResponse<unknown>>(
      '/api/v1/work-history/summary',
      { params: userId ? { user_id: userId } : undefined }
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || 'サマリー情報の取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data);
  },

  /**
   * 職務経歴検索
   * @param params 検索パラメータ
   * @returns 検索結果
   */
  async searchWorkHistory(params: WorkHistorySearchParams): Promise<WorkHistoryData> {
    const response = await axiosInstance.get<ApiResponse<WorkHistoryData>>(
      '/api/v1/work-history/search',
      { params: convertCamelToSnake(params) }
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '職務経歴の検索に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as WorkHistoryData;
  },
};

/**
 * マスターデータ取得用API
 */
export const masterDataApi = {
  /**
   * 業種マスターを取得
   * @returns 業種リスト
   */
  async getIndustries(): Promise<Industry[]> {
    const response = await axiosInstance.get<ApiResponse<Industry[]>>(
      '/api/v1/masters/industries'
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '業種マスターの取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as Industry[];
  },

  /**
   * 工程マスターを取得
   * @returns 工程リスト
   */
  async getProcesses(): Promise<Process[]> {
    const response = await axiosInstance.get<ApiResponse<Process[]>>(
      '/api/v1/masters/processes'
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '工程マスターの取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as Process[];
  },

  /**
   * 技術マスターを取得
   * @param categoryId カテゴリID（任意）
   * @returns 技術マスターリスト
   */
  async getTechnologies(categoryId?: string): Promise<TechnologyMaster[]> {
    const response = await axiosInstance.get<ApiResponse<TechnologyMaster[]>>(
      '/api/v1/masters/technologies',
      { params: categoryId ? { category_id: categoryId } : undefined }
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || '技術マスターの取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as TechnologyMaster[];
  },
};

/**
 * 管理者向けAPI
 */
export const adminWorkHistoryApi = {
  /**
   * 管理者用：エンジニアの職務経歴を取得
   * @param userId エンジニアのユーザーID
   * @returns 職務経歴データ
   */
  async getEngineerWorkHistory(userId: string): Promise<WorkHistoryData> {
    const response = await axiosInstance.get<ApiResponse<WorkHistoryData>>(
      `/api/v1/admin/engineers/work-history/${userId}`
    );
    
    if (!response.data.data) {
      throw new Error(response.data.error || 'エンジニアの職務経歴取得に失敗しました');
    }
    
    return convertSnakeToCamel(response.data.data) as WorkHistoryData;
  },

  /**
   * 管理者用：エンジニアの職務経歴書PDFをダウンロード
   * @param userId エンジニアのユーザーID
   * @param params PDFエクスポートパラメータ
   * @returns Blobデータとファイル名
   */
  async downloadEngineerPDF(userId: string, params?: PDFExportParams): Promise<{ blob: Blob; fileName: string }> {
    const response = await axiosInstance.get(`/api/v1/admin/engineers/work-history/${userId}/pdf`, {
      params: convertCamelToSnake(params),
      responseType: 'blob',
    });

    // Content-Dispositionヘッダーからファイル名を取得
    const contentDisposition = response.headers['content-disposition'];
    let fileName = '職務経歴書.pdf';
    
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename\*?=['"]?([^'"\s]+)['"]?/);
      if (fileNameMatch && fileNameMatch[1]) {
        // RFC 5987形式のデコード
        if (fileNameMatch[1].includes("''")) {
          const [encoding, , encodedName] = fileNameMatch[1].split("'");
          if (encoding.toLowerCase() === 'utf-8') {
            fileName = decodeURIComponent(encodedName);
          }
        } else {
          fileName = fileNameMatch[1];
        }
      }
    }

    return {
      blob: response.data,
      fileName,
    };
  },
};

// デフォルトエクスポート
export default workHistoryApi;

// 名前付きエクスポート（重複を避けるため削除）

/**
 * レガシー関数（後方互換性のため）
 */
export const fetchWorkHistory = workHistoryApi.getWorkHistory;
export const updateWorkHistory = workHistoryApi.updateAllWorkHistory;
export const saveWorkHistoryTemporary = workHistoryApi.saveTemporary;
export const fetchTechnologySuggestions = (category: string, query: string) => 
  workHistoryApi.getTechnologySuggestions({ query, categoryName: category, limit: 20 });
export const downloadWorkHistoryPDF = workHistoryApi.downloadPDF;