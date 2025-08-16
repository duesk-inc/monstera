import { useState, useCallback } from 'react'
import { mutate } from 'swr'
import { toast } from 'react-hot-toast'
import { workHistoryApi, WorkHistoryApiError } from '@/lib/api/workHistory'
import type { 
  WorkHistory, 
  WorkHistoryCreateRequest, 
  WorkHistoryUpdateRequest 
} from '@/types/workHistory'
import { 
  getWorkHistoryCacheKey, 
  getWorkHistoryListCacheKey 
} from './useWorkHistory'

/**
 * 職務経歴の作成・更新・削除を行うカスタムフック
 */
export const useWorkHistoryMutation = () => {
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * 職務経歴を作成
   */
  const create = useCallback(async (
    data: WorkHistoryCreateRequest,
    options?: {
      onSuccess?: (workHistory: WorkHistory) => void
      onError?: (error: Error) => void
      showToast?: boolean
    }
  ) => {
    setIsCreating(true)
    setError(null)

    try {
      const workHistory = await workHistoryApi.create(data)
      
      // キャッシュを更新
      await mutate(
        getWorkHistoryListCacheKey(data.user_id),
        async (current: any) => {
          if (!current) return current
          return {
            ...current,
            work_histories: [workHistory, ...current.work_histories],
            total: current.total + 1
          }
        },
        false
      )
      
      // 成功通知
      if (options?.showToast !== false) {
        toast.success('職務経歴を作成しました')
      }
      
      options?.onSuccess?.(workHistory)
      return workHistory
    } catch (err) {
      const error = err instanceof Error ? err : new Error('職務経歴の作成に失敗しました')
      setError(error)
      
      if (options?.showToast !== false) {
        toast.error(error.message)
      }
      
      options?.onError?.(error)
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [])

  /**
   * 職務経歴を更新
   */
  const update = useCallback(async (
    id: string,
    data: WorkHistoryUpdateRequest,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
      showToast?: boolean
      optimistic?: boolean
    }
  ) => {
    setIsUpdating(true)
    setError(null)

    try {
      // 楽観的更新
      if (options?.optimistic) {
        await mutate(
          getWorkHistoryCacheKey(id),
          async (current: WorkHistory | undefined) => {
            if (!current) return current
            return { ...current, ...data }
          },
          false
        )
      }

      await workHistoryApi.update(id, data)
      
      // キャッシュを再取得
      await mutate(getWorkHistoryCacheKey(id))
      
      // 一覧キャッシュも更新
      await mutate(
        (key: string) => key.startsWith('/api/v1/work-history?'),
        undefined,
        { revalidate: true }
      )
      
      // 成功通知
      if (options?.showToast !== false) {
        toast.success('職務経歴を更新しました')
      }
      
      options?.onSuccess?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('職務経歴の更新に失敗しました')
      setError(error)
      
      // 楽観的更新をロールバック
      if (options?.optimistic) {
        await mutate(getWorkHistoryCacheKey(id))
      }
      
      if (options?.showToast !== false) {
        toast.error(error.message)
      }
      
      options?.onError?.(error)
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [])

  /**
   * 職務経歴を削除
   */
  const deleteWorkHistory = useCallback(async (
    id: string,
    userId: string,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
      showToast?: boolean
      confirm?: boolean
    }
  ) => {
    // 確認ダイアログ
    if (options?.confirm !== false) {
      if (!window.confirm('この職務経歴を削除してもよろしいですか？')) {
        return
      }
    }

    setIsDeleting(true)
    setError(null)

    try {
      await workHistoryApi.delete(id)
      
      // キャッシュから削除
      await mutate(
        getWorkHistoryListCacheKey(userId),
        async (current: any) => {
          if (!current) return current
          return {
            ...current,
            work_histories: current.work_histories.filter((wh: WorkHistory) => wh.id !== id),
            total: current.total - 1
          }
        },
        false
      )
      
      // 個別キャッシュも削除
      await mutate(getWorkHistoryCacheKey(id), undefined, false)
      
      // 成功通知
      if (options?.showToast !== false) {
        toast.success('職務経歴を削除しました')
      }
      
      options?.onSuccess?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('職務経歴の削除に失敗しました')
      setError(error)
      
      if (options?.showToast !== false) {
        toast.error(error.message)
      }
      
      options?.onError?.(error)
      throw error
    } finally {
      setIsDeleting(false)
    }
  }, [])

  /**
   * 職務経歴を一括作成
   */
  const bulkCreate = useCallback(async (
    data: WorkHistoryCreateRequest[],
    options?: {
      onSuccess?: (workHistories: WorkHistory[]) => void
      onError?: (error: Error) => void
      showToast?: boolean
    }
  ) => {
    setIsCreating(true)
    setError(null)

    try {
      const workHistories = await workHistoryApi.bulkCreate(data)
      
      // キャッシュを更新（最初のユーザーIDを使用）
      if (data.length > 0) {
        await mutate(
          getWorkHistoryListCacheKey(data[0].user_id),
          undefined,
          { revalidate: true }
        )
      }
      
      // 成功通知
      if (options?.showToast !== false) {
        toast.success(`${workHistories.length}件の職務経歴を作成しました`)
      }
      
      options?.onSuccess?.(workHistories)
      return workHistories
    } catch (err) {
      const error = err instanceof Error ? err : new Error('職務経歴の一括作成に失敗しました')
      setError(error)
      
      if (options?.showToast !== false) {
        toast.error(error.message)
      }
      
      options?.onError?.(error)
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [])

  /**
   * 職務経歴を一括削除
   */
  const bulkDelete = useCallback(async (
    ids: string[],
    userId: string,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
      showToast?: boolean
      confirm?: boolean
    }
  ) => {
    // 確認ダイアログ
    if (options?.confirm !== false) {
      if (!window.confirm(`${ids.length}件の職務経歴を削除してもよろしいですか？`)) {
        return
      }
    }

    setIsDeleting(true)
    setError(null)

    try {
      await workHistoryApi.bulkDelete(ids)
      
      // キャッシュを更新
      await mutate(
        getWorkHistoryListCacheKey(userId),
        async (current: any) => {
          if (!current) return current
          return {
            ...current,
            work_histories: current.work_histories.filter(
              (wh: WorkHistory) => !ids.includes(wh.id)
            ),
            total: current.total - ids.length
          }
        },
        false
      )
      
      // 個別キャッシュも削除
      for (const id of ids) {
        await mutate(getWorkHistoryCacheKey(id), undefined, false)
      }
      
      // 成功通知
      if (options?.showToast !== false) {
        toast.success(`${ids.length}件の職務経歴を削除しました`)
      }
      
      options?.onSuccess?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('職務経歴の一括削除に失敗しました')
      setError(error)
      
      if (options?.showToast !== false) {
        toast.error(error.message)
      }
      
      options?.onError?.(error)
      throw error
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return {
    create,
    update,
    delete: deleteWorkHistory,
    bulkCreate,
    bulkDelete,
    isCreating,
    isUpdating,
    isDeleting,
    isLoading: isCreating || isUpdating || isDeleting,
    error
  }
}

/**
 * 職務経歴のエクスポートを行うカスタムフック
 */
export const useWorkHistoryExport = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const exportWorkHistory = useCallback(async (
    userId: string,
    format: 'pdf' | 'excel' | 'word' = 'pdf',
    options?: {
      onSuccess?: (downloadUrl: string) => void
      onError?: (error: Error) => void
      showToast?: boolean
    }
  ) => {
    setIsExporting(true)
    setError(null)

    try {
      const result = await workHistoryApi.export(userId, format)
      
      // 成功通知
      if (options?.showToast !== false) {
        toast.success('エクスポートを開始しました')
      }
      
      // ダウンロードURLを開く
      window.open(result.download_url, '_blank')
      
      options?.onSuccess?.(result.download_url)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('エクスポートに失敗しました')
      setError(error)
      
      if (options?.showToast !== false) {
        toast.error(error.message)
      }
      
      options?.onError?.(error)
      throw error
    } finally {
      setIsExporting(false)
    }
  }, [])

  return {
    exportWorkHistory,
    isExporting,
    error
  }
}