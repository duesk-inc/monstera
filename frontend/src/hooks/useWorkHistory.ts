import useSWR, { SWRConfiguration } from 'swr'
import { workHistoryApi } from '@/lib/api/workHistory'
import type { WorkHistory, WorkHistoryListResponse } from '@/types/workHistory'

/**
 * 職務経歴を取得するカスタムフック
 * @param id 職務経歴ID
 * @param options SWR設定オプション
 */
export const useWorkHistory = (
  id: string | null | undefined,
  options?: SWRConfiguration
) => {
  const { data, error, isLoading, mutate } = useSWR<WorkHistory>(
    id ? `/api/v1/work-history/${id}` : null,
    () => workHistoryApi.get(id!),
    {
      revalidateOnFocus: false,
      ...options
    }
  )

  return {
    workHistory: data,
    isLoading,
    isError: !!error,
    error,
    mutate
  }
}

/**
 * ユーザーの職務経歴一覧を取得するカスタムフック
 * @param userId ユーザーID
 * @param page ページ番号
 * @param limit 1ページあたりの件数
 * @param options SWR設定オプション
 */
export const useWorkHistoryList = (
  userId: string | null | undefined,
  page: number = 1,
  limit: number = 20,
  options?: SWRConfiguration
) => {
  const { data, error, isLoading, mutate } = useSWR<WorkHistoryListResponse>(
    userId ? `/api/v1/work-history?user_id=${userId}&page=${page}&limit=${limit}` : null,
    () => workHistoryApi.list(userId!, page, limit),
    {
      revalidateOnFocus: false,
      ...options
    }
  )

  return {
    workHistories: data?.work_histories || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || limit,
    hasNext: data?.has_next || false,
    isLoading,
    isError: !!error,
    error,
    mutate
  }
}

/**
 * 職務経歴サマリーを取得するカスタムフック
 * @param userId ユーザーID
 * @param options SWR設定オプション
 */
export const useWorkHistorySummary = (
  userId: string | null | undefined,
  options?: SWRConfiguration
) => {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/v1/work-history/users/${userId}/summary` : null,
    () => workHistoryApi.getSummary(userId!),
    {
      revalidateOnFocus: false,
      ...options
    }
  )

  return {
    summary: data,
    isLoading,
    isError: !!error,
    error,
    mutate
  }
}

/**
 * 職務経歴の検索を行うカスタムフック
 * @param params 検索パラメータ
 * @param enabled 検索を有効にするかどうか
 * @param options SWR設定オプション
 */
export const useWorkHistorySearch = (
  params: {
    keyword?: string
    technologies?: string[]
    role?: string
    industry?: number
    page?: number
    limit?: number
  },
  enabled: boolean = true,
  options?: SWRConfiguration
) => {
  const queryString = new URLSearchParams()
  
  if (params.keyword) queryString.append('keyword', params.keyword)
  if (params.technologies?.length) {
    params.technologies.forEach(tech => queryString.append('technologies', tech))
  }
  if (params.role) queryString.append('role', params.role)
  if (params.industry) queryString.append('industry', params.industry.toString())
  if (params.page) queryString.append('page', params.page.toString())
  if (params.limit) queryString.append('limit', params.limit.toString())

  const { data, error, isLoading, mutate } = useSWR<WorkHistoryListResponse>(
    enabled ? `/api/v1/work-history/search?${queryString.toString()}` : null,
    () => workHistoryApi.search(params),
    {
      revalidateOnFocus: false,
      ...options
    }
  )

  return {
    searchResults: data?.work_histories || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 20,
    hasNext: data?.has_next || false,
    isLoading,
    isError: !!error,
    error,
    mutate
  }
}

/**
 * 職務経歴のキャッシュキーを生成
 */
export const getWorkHistoryCacheKey = (id: string) => `/api/v1/work-history/${id}`

/**
 * 職務経歴一覧のキャッシュキーを生成
 */
export const getWorkHistoryListCacheKey = (userId: string, page?: number, limit?: number) => {
  const params = new URLSearchParams()
  params.append('user_id', userId)
  if (page) params.append('page', page.toString())
  if (limit) params.append('limit', limit.toString())
  return `/api/v1/work-history?${params.toString()}`
}