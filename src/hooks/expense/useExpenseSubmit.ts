import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createExpense, 
  updateExpense, 
  deleteExpense, 
  submitExpense, 
  cancelExpense 
} from '@/lib/api/expense';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import { useToast } from '@/components/common/Toast';
import { EXPENSE_MESSAGES } from '@/constants/expense';
import type { 
  ExpenseFormData, 
  ExpenseData 
} from '@/types/expense';

// フック戻り値の型定義
export interface UseExpenseSubmitReturn {
  // 状態
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isSubmitting: boolean;
  isCancelling: boolean;
  isLoading: boolean;
  
  // アクション
  createExpense: (data: ExpenseFormData) => Promise<ExpenseData>;
  updateExpense: (id: string, data: ExpenseFormData) => Promise<ExpenseData>;
  deleteExpense: (id: string) => Promise<void>;
  submitExpense: (id: string) => Promise<ExpenseData>;
  cancelExpense: (id: string) => Promise<ExpenseData>;
  
  // ヘルパー関数
  invalidateQueries: () => void;
  resetStates: () => void;
}

/**
 * 経費申請の作成・更新・削除・提出・取消を管理するカスタムフック
 * 各操作の状態管理とエラーハンドリング、キャッシュ更新を提供
 */
export const useExpenseSubmit = (): UseExpenseSubmitReturn => {
  
  const { handleSubmissionError } = useEnhancedErrorHandler();
  const { showSuccess } = useToast();
  const queryClient = useQueryClient();

  // ローカル状態（追加のローディング状態管理用）
  const [localStates, setLocalStates] = useState({
    isProcessing: false,
  });

  // 作成ミューテーション
  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => createExpense(data),
    onSuccess: (newExpense: ExpenseData) => {
      showSuccess(EXPENSE_MESSAGES.CREATE_SUCCESS);
      
      // キャッシュ更新
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      
      // 新しく作成された経費申請をキャッシュに追加
      queryClient.setQueryData(['expense', newExpense.id], newExpense);
    },
    onError: (error) => {
      handleSubmissionError(error, '経費申請の作成');
    },
  });

  // 更新ミューテーション
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormData }) => 
      updateExpense(id, data),
    onSuccess: (updatedExpense: ExpenseData) => {
      showSuccess(EXPENSE_MESSAGES.UPDATE_SUCCESS);
      
      // キャッシュ更新
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.setQueryData(['expense', updatedExpense.id], updatedExpense);
    },
    onError: (error) => {
      handleSubmissionError(error, '経費申請の更新');
    },
  });

  // 削除ミューテーション
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: (_, deletedId) => {
      showSuccess(EXPENSE_MESSAGES.DELETE_SUCCESS);
      
      // キャッシュから削除
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.removeQueries({ queryKey: ['expense', deletedId] });
    },
    onError: (error) => {
      handleSubmissionError(error, '経費申請の削除');
    },
  });

  // 提出ミューテーション
  const submitMutation = useMutation({
    mutationFn: (id: string) => submitExpense(id),
    onSuccess: (submittedExpense: ExpenseData) => {
      showSuccess(EXPENSE_MESSAGES.SUBMIT_SUCCESS);
      
      // キャッシュ更新
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.setQueryData(['expense', submittedExpense.id], submittedExpense);
    },
    onError: (error) => {
      handleSubmissionError(error, '経費申請の提出');
    },
  });

  // 取消ミューテーション
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelExpense(id),
    onSuccess: (cancelledExpense: ExpenseData) => {
      showSuccess(EXPENSE_MESSAGES.CANCEL_SUCCESS);
      
      // キャッシュ更新
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.setQueryData(['expense', cancelledExpense.id], cancelledExpense);
    },
    onError: (error) => {
      handleSubmissionError(error, '経費申請の取消');
    },
  });

  // ラップした関数たち
  const handleCreateExpense = useCallback(async (data: ExpenseFormData): Promise<ExpenseData> => {
    setLocalStates(prev => ({ ...prev, isProcessing: true }));
    try {
      const result = await createMutation.mutateAsync(data);
      return result;
    } finally {
      setLocalStates(prev => ({ ...prev, isProcessing: false }));
    }
  }, [createMutation]);

  const handleUpdateExpense = useCallback(async (id: string, data: ExpenseFormData): Promise<ExpenseData> => {
    setLocalStates(prev => ({ ...prev, isProcessing: true }));
    try {
      const result = await updateMutation.mutateAsync({ id, data });
      return result;
    } finally {
      setLocalStates(prev => ({ ...prev, isProcessing: false }));
    }
  }, [updateMutation]);

  const handleDeleteExpense = useCallback(async (id: string): Promise<void> => {
    setLocalStates(prev => ({ ...prev, isProcessing: true }));
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setLocalStates(prev => ({ ...prev, isProcessing: false }));
    }
  }, [deleteMutation]);

  const handleSubmitExpense = useCallback(async (id: string): Promise<ExpenseData> => {
    setLocalStates(prev => ({ ...prev, isProcessing: true }));
    try {
      const result = await submitMutation.mutateAsync(id);
      return result;
    } finally {
      setLocalStates(prev => ({ ...prev, isProcessing: false }));
    }
  }, [submitMutation]);

  const handleCancelExpense = useCallback(async (id: string): Promise<ExpenseData> => {
    setLocalStates(prev => ({ ...prev, isProcessing: true }));
    try {
      const result = await cancelMutation.mutateAsync(id);
      return result;
    } finally {
      setLocalStates(prev => ({ ...prev, isProcessing: false }));
    }
  }, [cancelMutation]);

  // キャッシュ無効化
  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['expense'] });
  }, [queryClient]);

  // 状態リセット
  const resetStates = useCallback(() => {
    setLocalStates({ isProcessing: false });
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
    submitMutation.reset();
    cancelMutation.reset();
  }, [createMutation, updateMutation, deleteMutation, submitMutation, cancelMutation]);

  // 状態の統合
  const isLoading = 
    localStates.isProcessing ||
    createMutation.isPending || 
    updateMutation.isPending || 
    deleteMutation.isPending || 
    submitMutation.isPending || 
    cancelMutation.isPending;

  return {
    // 状態
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSubmitting: submitMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isLoading,
    
    // アクション
    createExpense: handleCreateExpense,
    updateExpense: handleUpdateExpense,
    deleteExpense: handleDeleteExpense,
    submitExpense: handleSubmitExpense,
    cancelExpense: handleCancelExpense,
    
    // ヘルパー関数
    invalidateQueries,
    resetStates,
  };
};

// 型を再エクスポート
export type { 
  ExpenseFormData, 
  ExpenseData 
} from '@/types/expense';