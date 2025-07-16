import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getExpenseCategories } from '@/lib/api/expense';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import type { ExpenseCategory } from '@/types/expense';

// キャッシュ時間定数（24時間）
const CATEGORY_CACHE_TIME = 24 * 60 * 60 * 1000;
// リトライ設定定数
const MAX_RETRY_COUNT = 3;
const RETRY_BASE_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const SERVER_ERROR_THRESHOLD = 500;

// フック引数の型定義
export interface UseCategoriesParams {
  enabled?: boolean;
  includeInactive?: boolean;
  refetchInterval?: number | false;
}

// フック戻り値の型定義
export interface UseCategoriesReturn {
  // データ
  categories: ExpenseCategory[];
  activeCategories: ExpenseCategory[];
  
  // 状態
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  
  // アクション
  refetch: () => void;
  invalidateCache: () => void;
  
  // ヘルパー関数
  getCategoryById: (id: string) => ExpenseCategory | undefined;
  getCategoryByName: (name: string) => ExpenseCategory | undefined;
  getCategoriesForSelect: () => Array<{ value: string; label: string; disabled?: boolean }>;
  
  // データ取得状態
  isSuccess: boolean;
  isStale: boolean;
}

/**
 * 経費カテゴリ情報を管理するカスタムフック
 * カテゴリ一覧の取得、フィルタリング、検索機能を提供
 */
export const useCategories = ({
  enabled = true,
  includeInactive = false,
  refetchInterval = false,
}: UseCategoriesParams = {}): UseCategoriesReturn => {
  
  const { handleSubmissionError } = useEnhancedErrorHandler();
  const queryClient = useQueryClient();

  // React Query設定
  const {
    data: categories,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: queryRefetch,
    isSuccess,
    isStale,
  } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: ({ signal }) => getExpenseCategories(signal),
    enabled,
    staleTime: CATEGORY_CACHE_TIME, // 24時間（カテゴリは頻繁に変更されない）
    gcTime: CATEGORY_CACHE_TIME, // 24時間
    refetchInterval,
    retry: (failureCount, error) => {
      // ネットワークエラーの場合のみリトライ
      if (error && 'status' in error && typeof error.status === 'number') {
        return error.status >= SERVER_ERROR_THRESHOLD && failureCount < MAX_RETRY_COUNT;
      }
      return failureCount < MAX_RETRY_COUNT;
    },
    retryDelay: (attemptIndex) => Math.min(RETRY_BASE_DELAY * 2 ** attemptIndex, MAX_RETRY_DELAY),
  });

  // アクティブなカテゴリのフィルタリング
  const activeCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(category => category.isActive);
  }, [categories]);

  // 表示用カテゴリリストの決定
  const displayCategories = useMemo(() => {
    if (!categories) return [];
    return includeInactive ? categories : activeCategories;
  }, [categories, activeCategories, includeInactive]);

  // リフェッチ関数（エラーハンドリング付き）
  const refetch = () => {
    queryRefetch().catch((error) => {
      handleSubmissionError(error, '経費カテゴリの再取得');
    });
  };

  // キャッシュ無効化
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
  };

  // ID でカテゴリを検索
  const getCategoryById = (id: string): ExpenseCategory | undefined => {
    return displayCategories.find(category => category.id === id);
  };

  // 名前でカテゴリを検索
  const getCategoryByName = (name: string): ExpenseCategory | undefined => {
    return displayCategories.find(category => category.name === name);
  };

  // セレクトボックス用のオプション配列を生成
  const getCategoriesForSelect = () => {
    return displayCategories
      .sort((a, b) => {
        // 表示順序でソート（未設定の場合は名前順）
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return a.name.localeCompare(b.name, 'ja');
      })
      .map(category => ({
        value: category.id,
        label: category.name,
        disabled: !category.isActive,
      }));
  };

  // エラーハンドリング
  if (isError && error) {
    handleSubmissionError(error, '経費カテゴリの取得');
  }

  return {
    // データ
    categories: displayCategories,
    activeCategories,
    
    // 状態
    isLoading,
    isFetching,
    isError,
    error,
    
    // アクション
    refetch,
    invalidateCache,
    
    // ヘルパー関数
    getCategoryById,
    getCategoryByName,
    getCategoriesForSelect,
    
    // データ取得状態
    isSuccess,
    isStale,
  };
};

// 型を再エクスポート
export type { ExpenseCategory } from '@/types/expense';