import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { workHistoryApi } from '@/lib/api/workHistory'
import type { WorkHistory, WorkHistoryListResponse } from '@/types/workHistory'

/**
 * 職務経歴を取得するカスタムフック
 * @param id 職務経歴ID
 * @param options React Query設定オプション
 */
export const useWorkHistory = (
  id: string | null | undefined,
  options?: UseQueryOptions<WorkHistory>
) => {
  const { data, error, isLoading, refetch } = useQuery<WorkHistory>({
    queryKey: ['work-history', id],
    queryFn: () => workHistoryApi.get(id!),
    enabled: !!id,
    ...options
  })

  return {
    workHistory: data,
    isLoading,
    isError: !!error,
    error,
    refetch
  }
}

/**
 * ユーザーの職務経歴一覧を取得するカスタムフック
 * @param userId ユーザーID
 * @param page ページ番号
 * @param limit 1ページあたりの件数
 * @param options React Query設定オプション
 */
export const useWorkHistoryList = (
  userId: string | null | undefined,
  page: number = 1,
  limit: number = 20,
  options?: UseQueryOptions<WorkHistoryListResponse>
) => {
  const { data, error, isLoading, refetch } = useQuery<WorkHistoryListResponse>({
    queryKey: ['work-history-list', userId, page, limit],
    queryFn: () => workHistoryApi.list(userId!, page, limit),
    enabled: !!userId,
    ...options
  })

  return {
    workHistories: data?.work_histories || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || limit,
    hasNext: data?.has_next || false,
    isLoading,
    isError: !!error,
    error,
    refetch
  }
}

/**
 * 職務経歴サマリーを取得するカスタムフック
 * @param userId ユーザーID
 * @param options React Query設定オプション
 */
export const useWorkHistorySummary = (
  userId: string | null | undefined,
  options?: UseQueryOptions
) => {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['work-history-summary', userId],
    queryFn: () => workHistoryApi.getSummary(userId!),
    enabled: !!userId,
    ...options
  })

  return {
    summary: data,
    isLoading,
    isError: !!error,
    error,
    refetch
  }
}

/**
 * 職務経歴の検索を行うカスタムフック
 * @param params 検索パラメータ
 * @param enabled 検索を有効にするかどうか
 * @param options React Query設定オプション
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
  options?: UseQueryOptions<WorkHistoryListResponse>
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

  const { data, error, isLoading, refetch } = useQuery<WorkHistoryListResponse>({
    queryKey: ['work-history-search', params],
    queryFn: () => workHistoryApi.search(params),
    enabled: enabled,
    ...options
  })

  return {
    searchResults: data?.work_histories || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 20,
    hasNext: data?.has_next || false,
    isLoading,
    isError: !!error,
    error,
    refetch
  }
}

/**
 * 職務経歴のキャッシュキーを生成
 */
export const getWorkHistoryCacheKey = (id: string) => `work-history-${id}`

/**
 * 職務経歴一覧のキャッシュキーを生成
 */
export const getWorkHistoryListCacheKey = (userId: string, page?: number, limit?: number) => {
  if (page && limit) {
    return `work-history-list-${userId}-${page}-${limit}`
  }
  return `work-history-list-${userId}`
}