import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getExpense } from '@/lib/api/expense';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import type { ExpenseData } from '@/types/expense';

// フック引数の型定義
export interface UseExpenseDetailParams {
  expenseId: string;
  enabled?: boolean;
  refetchInterval?: number | false;
}

// フック戻り値の型定義
export interface UseExpenseDetailReturn {
  // データ
  expense: ExpenseData | null;
  
  // 状態
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  
  // アクション
  refetch: () => void;
  invalidateCache: () => void;
  
  // ステータス判定ヘルパー
  canEdit: boolean;
  canSubmit: boolean;
  canCancel: boolean;
  canDelete: boolean;
  
  // データ取得状態
  isSuccess: boolean;
  isStale: boolean;
}

/**
 * 経費申請詳細データを管理するカスタムフック
 * 指定されたIDの経費申請詳細を取得・管理
 */
export const useExpenseDetail = ({
  expenseId,
  enabled = true,
  refetchInterval = false,
}: UseExpenseDetailParams): UseExpenseDetailReturn => {
  
  const { handleSubmissionError } = useEnhancedErrorHandler();
  const queryClient = useQueryClient();

  // React Query設定
  const {
    data: expense,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: queryRefetch,
    isSuccess,
    isStale,
  } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: ({ signal }) => getExpense(expenseId, signal),
    enabled: enabled && !!expenseId,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
    refetchInterval,
    retry: (failureCount, error) => {
      // 404エラーの場合はリトライしない
      if (error && 'status' in error && error.status === 404) {
        return false;
      }
      // ネットワークエラーの場合のみリトライ
      if (error && 'status' in error && typeof error.status === 'number') {
        return error.status >= 500 && failureCount < 3;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // リフェッチ関数（エラーハンドリング付き）
  const refetch = () => {
    queryRefetch().catch((error) => {
      handleSubmissionError(error, '経費申請詳細の再取得');
    });
  };

  // キャッシュ無効化
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['expense', expenseId] });
    // 一覧キャッシュも無効化（詳細が更新された可能性があるため）
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  // ステータス判定ヘルパー関数
  const canEdit = expense?.status === 'draft' || expense?.status === 'rejected';
  
  const canSubmit = expense?.status === 'draft';
  
  const canCancel = expense?.status === 'submitted';
  
  const canDelete = expense?.status === 'draft' || expense?.status === 'rejected';

  // エラーハンドリング
  if (isError && error) {
    handleSubmissionError(error, '経費申請詳細の取得');
  }

  return {
    // データ
    expense: expense || null,
    
    // 状態
    isLoading,
    isFetching,
    isError,
    error,
    
    // アクション
    refetch,
    invalidateCache,
    
    // ステータス判定ヘルパー
    canEdit,
    canSubmit,
    canCancel,
    canDelete,
    
    // データ取得状態
    isSuccess,
    isStale,
  };
};

// 型を再エクスポート
export type { ExpenseData } from '@/types/expense';