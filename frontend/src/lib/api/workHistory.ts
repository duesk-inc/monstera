import apiClient from '@/lib/axios'
import type { 
  WorkHistory, 
  WorkHistoryCreateRequest, 
  WorkHistoryUpdateRequest,
  WorkHistoryListResponse 
} from '@/types/workHistory'

/**
 * 職務経歴API Client
 * 個別の職務経歴CRUD操作を提供
 */
export const workHistoryApi = {
  /**
   * 職務経歴を取得
   * @param id 職務経歴ID
   * @returns 職務経歴データ
   */
  get: async (id: string): Promise<WorkHistory> => {
    const response = await apiClient.get(`/work-history/${id}`)
    return response.data.work_history
  },

  /**
   * ユーザーの職務経歴一覧を取得
   * @param userId ユーザーID
   * @param page ページ番号（1始まり）
   * @param limit 1ページあたりの件数
   * @returns 職務経歴一覧レスポンス
   */
  list: async (
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<WorkHistoryListResponse> => {
    const response = await apiClient.get('/work-history', {
      params: {
        user_id: userId,
        page,
        limit
      }
    })
    return response.data
  },

  /**
   * 職務経歴を作成
   * @param data 作成データ
   * @returns 作成された職務経歴
   */
  create: async (data: WorkHistoryCreateRequest): Promise<WorkHistory> => {
    const response = await apiClient.post('/work-history', data)
    return response.data.work_history
  },

  /**
   * 職務経歴を更新
   * @param id 職務経歴ID
   * @param data 更新データ
   * @returns 更新結果
   */
  update: async (id: string, data: WorkHistoryUpdateRequest): Promise<void> => {
    await apiClient.put(`/work-history/${id}`, data)
  },

  /**
   * 職務経歴を削除
   * @param id 職務経歴ID
   * @returns 削除結果
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/work-history/${id}`)
  },

  /**
   * 職務経歴を一括作成
   * @param data 作成データ配列
   * @returns 作成された職務経歴配列
   */
  bulkCreate: async (data: WorkHistoryCreateRequest[]): Promise<WorkHistory[]> => {
    const response = await apiClient.post('/work-history/bulk', { work_histories: data })
    return response.data.work_histories
  },

  /**
   * 職務経歴を一括更新
   * @param data 更新データ配列（IDを含む）
   * @returns 更新結果
   */
  bulkUpdate: async (data: Array<WorkHistoryUpdateRequest & { id: string }>): Promise<void> => {
    await apiClient.put('/work-history/bulk', { work_histories: data })
  },

  /**
   * 職務経歴を一括削除
   * @param ids 削除対象のID配列
   * @returns 削除結果
   */
  bulkDelete: async (ids: string[]): Promise<void> => {
    await apiClient.delete('/work-history/bulk', { data: { ids } })
  },

  /**
   * 職務経歴を検索
   * @param params 検索パラメータ
   * @returns 検索結果
   */
  search: async (params: {
    keyword?: string
    technologies?: string[]
    role?: string
    industry?: number
    page?: number
    limit?: number
  }): Promise<WorkHistoryListResponse> => {
    const response = await apiClient.get('/work-history/search', { params })
    return response.data
  },

  /**
   * 職務経歴サマリーを取得
   * @param userId ユーザーID
   * @returns サマリー情報
   */
  getSummary: async (userId: string): Promise<any> => {
    const response = await apiClient.get(`/work-history/users/${userId}/summary`)
    return response.data
  },

  /**
   * 職務経歴をエクスポート
   * @param userId ユーザーID
   * @param format エクスポート形式（pdf/excel/word）
   * @returns ダウンロードURL
   */
  export: async (userId: string, format: 'pdf' | 'excel' | 'word' = 'pdf'): Promise<{ download_url: string; expires_at: string }> => {
    const response = await apiClient.post('/work-history/export', null, {
      params: {
        user_id: userId,
        format
      }
    })
    return response.data
  }
}

/**
 * 職務経歴API用のエラーハンドリング
 */
export class WorkHistoryApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'WorkHistoryApiError'
  }
}

/**
 * 職務経歴APIレスポンスの型ガード
 */
export const isWorkHistory = (data: any): data is WorkHistory => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.project_name === 'string' &&
    typeof data.user_id === 'string'
  )
}

/**
 * 日付文字列のフォーマット（YYYY-MM-DD形式に変換）
 */
export const formatDateForApi = (date: Date | string): string => {
  if (typeof date === 'string') {
    // すでに文字列の場合はそのまま返す（バリデーションはバックエンドで実施）
    return date
  }
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * API日付文字列をDateオブジェクトに変換
 */
export const parseApiDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}