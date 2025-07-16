import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getExpenseList } from '@/lib/api/expense';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import { PAGINATION_CONSTANTS, FILTER_CONSTANTS, SORT_DIRECTION, SORTABLE_FIELDS } from '@/constants/expense';
import type {
  ExpenseData,
  ExpenseListParams,
  ExpenseListResponse,
  ExpenseFilters,
  ExpenseSort,
  ExpensePagination,
  ExpenseStatusType,
  SortDirectionType,
  SortableFieldType
} from '@/types/expense';

// フック引数の型定義
export interface UseExpensesParams {
  initialFilters?: Partial<ExpenseFilters>;
  initialSort?: ExpenseSort;
  initialPage?: number;
  initialPageSize?: number;
  autoFetch?: boolean;
}

// フック戻り値の型定義
export interface UseExpensesReturn {
  // データ
  expenses: ExpenseData[];
  pagination: ExpensePagination;
  filters: ExpenseFilters;
  sort: ExpenseSort;
  
  // 状態
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  
  // アクション
  setFilters: (filters: Partial<ExpenseFilters>) => void;
  setSort: (sort: ExpenseSort) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  clearFilters: () => void;
  refetch: () => void;
  
  // ヘルパー関数
  toggleSort: (field: SortableFieldType) => void;
  updateDateRange: (start?: string, end?: string) => void;
  updateStatusFilter: (statuses: ExpenseStatusType[]) => void;
  updateCategoryFilter: (categories: string[]) => void;
  updateAmountRange: (min?: number, max?: number) => void;
  updateYearFilter: (year?: number) => void;
  updateFiscalYearFilter: (fiscalYear?: number) => void;
  updateMonthFilter: (month?: number) => void;
  clearYearFilters: () => void;
  
  // キャッシュ操作
  invalidateCache: () => void;
  prefetchNextPage: () => void;
}

// デフォルトフィルター
const DEFAULT_FILTERS: ExpenseFilters = {
  status: [],
  categories: [],
  dateRange: {},
  amountRange: {},
};

// デフォルトソート
const DEFAULT_SORT: ExpenseSort = {
  field: SORTABLE_FIELDS.CREATED_AT,
  direction: SORT_DIRECTION.DESC,
};

/**
 * 経費申請一覧データを管理するカスタムフック
 * フィルタリング、ソート、ページネーション機能を提供
 */
export const useExpenses = ({
  initialFilters = {},
  initialSort = DEFAULT_SORT,
  initialPage = 1,
  initialPageSize = PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE,
  autoFetch = true,
}: UseExpensesParams = {}): UseExpensesReturn => {
  
  const { handleSubmissionError } = useEnhancedErrorHandler();
  const queryClient = useQueryClient();

  // 状態管理
  const [filters, setFiltersState] = useState<ExpenseFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  
  const [sort, setSortState] = useState<ExpenseSort>(initialSort);
  const [page, setPageState] = useState<number>(initialPage);
  const [pageSize, setPageSizeState] = useState<number>(initialPageSize);

  // クエリパラメータの構築
  const queryParams = useMemo((): ExpenseListParams => {
    const params: ExpenseListParams = {
      page,
      limit: pageSize,
    };

    // ソート条件
    if (sort.field && sort.direction) {
      // Note: バックエンドがソートパラメータを受け付ける場合に実装
      // params.sortBy = sort.field;
      // params.sortDirection = sort.direction;
    }

    // ステータスフィルター
    if (filters.status.length > 0) {
      params.status = filters.status[0]; // 単一ステータスのみサポートの場合
    }

    // カテゴリフィルター
    if (filters.categories.length > 0) {
      params.categoryId = filters.categories[0]; // 単一カテゴリのみサポートの場合
    }

    // 日付範囲フィルター（従来の方式）
    if (filters.dateRange.start) {
      params.startDate = filters.dateRange.start;
    }
    if (filters.dateRange.end) {
      params.endDate = filters.dateRange.end;
    }

    // 年度フィルター（新機能）
    if (filters.year !== undefined) {
      params.year = filters.year;
    }
    if (filters.fiscalYear !== undefined) {
      params.fiscalYear = filters.fiscalYear;
    }
    if (filters.month !== undefined) {
      params.month = filters.month;
    }

    return params;
  }, [page, pageSize, sort, filters]);

  // React Query設定
  const {
    data: queryData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['expenses', queryParams],
    queryFn: ({ signal }) => getExpenseList(queryParams, signal),
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
    retry: (failureCount, error) => {
      // ネットワークエラーの場合のみリトライ
      if (error && 'status' in error && typeof error.status === 'number') {
        return error.status >= 500 && failureCount < 3;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // レスポンスデータの分解
  const expenses = useMemo(() => queryData?.items || [], [queryData]);
  
  const pagination = useMemo((): ExpensePagination => {
    if (!queryData) {
      return {
        page: 1,
        limit: pageSize,
        total: 0,
        totalPages: 0,
      };
    }

    const totalPages = Math.ceil(queryData.total / pageSize);
    
    return {
      page,
      limit: pageSize,
      total: queryData.total,
      totalPages,
    };
  }, [queryData, page, pageSize]);

  // フィルター更新
  const setFilters = useCallback((newFilters: Partial<ExpenseFilters>) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
    }));
    setPageState(1); // フィルター変更時はページをリセット
  }, []);

  // ソート更新
  const setSort = useCallback((newSort: ExpenseSort) => {
    setSortState(newSort);
    setPageState(1); // ソート変更時はページをリセット
  }, []);

  // ページ変更
  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  // ページサイズ変更
  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPageState(1); // ページサイズ変更時はページをリセット
  }, []);

  // フィルタークリア
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPageState(1);
  }, []);

  // ソートトグル
  const toggleSort = useCallback((field: SortableFieldType) => {
    setSortState(prev => {
      if (prev.field === field) {
        // 同じフィールドの場合は昇順/降順を切り替え
        return {
          field,
          direction: prev.direction === SORT_DIRECTION.ASC 
            ? SORT_DIRECTION.DESC 
            : SORT_DIRECTION.ASC,
        };
      } else {
        // 異なるフィールドの場合は降順から開始
        return {
          field,
          direction: SORT_DIRECTION.DESC,
        };
      }
    });
    setPageState(1);
  }, []);

  // 日付範囲更新
  const updateDateRange = useCallback((start?: string, end?: string) => {
    setFilters({
      dateRange: { start, end },
    });
  }, [setFilters]);

  // ステータスフィルター更新
  const updateStatusFilter = useCallback((statuses: ExpenseStatusType[]) => {
    setFilters({
      status: statuses,
    });
  }, [setFilters]);

  // カテゴリフィルター更新
  const updateCategoryFilter = useCallback((categories: string[]) => {
    setFilters({
      categories,
    });
  }, [setFilters]);

  // 金額範囲更新
  const updateAmountRange = useCallback((min?: number, max?: number) => {
    setFilters({
      amountRange: { min, max },
    });
  }, [setFilters]);

  // 年フィルター更新
  const updateYearFilter = useCallback((year?: number) => {
    setFilters({
      year,
      fiscalYear: undefined, // カレンダー年を設定する場合は会計年度をクリア
    });
  }, [setFilters]);

  // 会計年度フィルター更新
  const updateFiscalYearFilter = useCallback((fiscalYear?: number) => {
    setFilters({
      fiscalYear,
      year: undefined, // 会計年度を設定する場合はカレンダー年をクリア
    });
  }, [setFilters]);

  // 月フィルター更新
  const updateMonthFilter = useCallback((month?: number) => {
    setFilters({
      month,
    });
  }, [setFilters]);

  // 年度フィルタークリア
  const clearYearFilters = useCallback(() => {
    setFilters({
      year: undefined,
      fiscalYear: undefined,
      month: undefined,
    });
  }, [setFilters]);

  // キャッシュ無効化
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  }, [queryClient]);

  // 次ページの事前読み込み
  const prefetchNextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      const nextPageParams = {
        ...queryParams,
        page: pagination.page + 1,
      };
      
      queryClient.prefetchQuery({
        queryKey: ['expenses', nextPageParams],
        queryFn: ({ signal }) => getExpenseList(nextPageParams, signal),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [queryClient, queryParams, pagination]);

  // エラーハンドリング
  if (isError && error) {
    handleSubmissionError(error, '経費申請一覧の取得');
  }

  return {
    // データ
    expenses,
    pagination,
    filters,
    sort,
    
    // 状態
    isLoading,
    isFetching,
    isError,
    error,
    
    // アクション
    setFilters,
    setSort,
    setPage,
    setPageSize,
    clearFilters,
    refetch,
    
    // ヘルパー関数
    toggleSort,
    updateDateRange,
    updateStatusFilter,
    updateCategoryFilter,
    updateAmountRange,
    updateYearFilter,
    updateFiscalYearFilter,
    updateMonthFilter,
    clearYearFilters,
    
    // キャッシュ操作
    invalidateCache,
    prefetchNextPage,
  };
};

// 型を再エクスポート（types/expense.tsから）
export type {
  ExpenseFilters,
  ExpenseSort,
  ExpensePagination,
} from '@/types/expense';