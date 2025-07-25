// 経費申請のサブミット処理を行うカスタムフック

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as expenseApi from '@/lib/api/expense';
import type { ExpenseFormData, ExpenseData } from '@/types/expense';

// APIリクエスト用の型変換
interface CreateExpenseRequest {
  categoryId: string;
  categoryCode?: string;
  amount: number;
  description: string;
  expenseDate: string;
  receiptUrl?: string;
  receiptS3Key?: string;
}

interface UpdateExpenseRequest extends CreateExpenseRequest {
  id: string;
}

// Hook のオプション
interface UseExpenseSubmitOptions {
  onSuccess?: (data: ExpenseData) => void;
  onError?: (error: Error) => void;
}

// Hook の戻り値
interface UseExpenseSubmitReturn {
  createExpense: (data: ExpenseFormData) => Promise<ExpenseData>;
  updateExpense: (id: string, data: ExpenseFormData) => Promise<ExpenseData>;
  isCreating: boolean;
  isUpdating: boolean;
  error: Error | null;
  reset: () => void;
}

// フォームデータをAPIリクエスト形式に変換
const transformFormDataToRequest = (formData: ExpenseFormData): CreateExpenseRequest => {
  return {
    categoryId: formData.categoryId,
    categoryCode: formData.categoryCode,
    amount: formData.amount,
    description: formData.description,
    expenseDate: formData.expenseDate,
    receiptUrl: formData.receiptUrl,
    receiptS3Key: formData.receiptS3Key,
  };
};

// APIレスポンスをフロントエンド形式に変換
const transformResponseToExpenseData = (response: any): ExpenseData => {
  return {
    id: response.id,
    userId: response.user_id || response.userId,
    categoryId: response.category_id || response.categoryId,
    categoryName: response.category_name || response.categoryName || '',
    amount: response.amount,
    description: response.description,
    expenseDate: response.expense_date || response.expenseDate,
    receiptUrl: response.receipt_url || response.receiptUrl,
    receiptS3Key: response.receipt_s3_key || response.receiptS3Key,
    status: response.status || 'draft',
    createdAt: response.created_at || response.createdAt,
    updatedAt: response.updated_at || response.updatedAt,
    submittedAt: response.submitted_at || response.submittedAt,
    approvedAt: response.approved_at || response.approvedAt,
    rejectedAt: response.rejected_at || response.rejectedAt,
    approverName: response.approver_name || response.approverName,
    rejectionReason: response.rejection_reason || response.rejectionReason,
  };
};

/**
 * 経費申請のサブミット処理を行うカスタムフック
 * 作成と更新の両方の機能を提供
 */
export const useExpenseSubmit = (options: UseExpenseSubmitOptions = {}): UseExpenseSubmitReturn => {
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  // 経費作成のミューテーション
  const createMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const requestData = transformFormDataToRequest(data);
      // APIリクエストを正しい形式に変換
      const apiRequestData: any = {
        title: requestData.description.substring(0, 50), // 件名として説明文の先頭を使用
        category: requestData.categoryCode || 'other', // カテゴリコード
        category_id: requestData.categoryId,
        amount: requestData.amount,
        expense_date: requestData.expenseDate,
        description: requestData.description,
        receipt_url: requestData.receiptUrl || '',
      };
      const response = await expenseApi.createExpense(apiRequestData);
      return transformResponseToExpenseData(response);
    },
    onSuccess: (data) => {
      setError(null);
      // 経費一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      
      // 成功コールバックを実行
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error: any) => {
      const errorObj = error instanceof Error ? error : new Error('経費申請の作成に失敗しました');
      setError(errorObj);
      
      // エラーコールバックを実行
      if (options.onError) {
        options.onError(errorObj);
      }
    },
  });

  // 経費更新のミューテーション
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExpenseFormData }) => {
      const requestData = transformFormDataToRequest(data);
      // APIリクエストを正しい形式に変換
      const apiRequestData: any = {
        id,
        title: requestData.description.substring(0, 50), // 件名として説明文の先頭を使用
        category: requestData.categoryCode || 'other', // カテゴリコード
        category_id: requestData.categoryId,
        amount: requestData.amount,
        expense_date: requestData.expenseDate,
        description: requestData.description,
        receipt_url: requestData.receiptUrl || '',
      };
      const response = await expenseApi.updateExpense(apiRequestData);
      return transformResponseToExpenseData(response);
    },
    onSuccess: (data) => {
      setError(null);
      // 経費一覧と詳細のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense', data.id] });
      
      // 成功コールバックを実行
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error: any) => {
      const errorObj = error instanceof Error ? error : new Error('経費申請の更新に失敗しました');
      setError(errorObj);
      
      // エラーコールバックを実行
      if (options.onError) {
        options.onError(errorObj);
      }
    },
  });

  // 経費作成関数
  const createExpense = useCallback(async (data: ExpenseFormData): Promise<ExpenseData> => {
    setError(null);
    return createMutation.mutateAsync(data);
  }, [createMutation]);

  // 経費更新関数
  const updateExpense = useCallback(async (id: string, data: ExpenseFormData): Promise<ExpenseData> => {
    setError(null);
    return updateMutation.mutateAsync({ id, data });
  }, [updateMutation]);

  // リセット関数
  const reset = useCallback(() => {
    setError(null);
    createMutation.reset();
    updateMutation.reset();
  }, [createMutation, updateMutation]);

  return {
    createExpense,
    updateExpense,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    error,
    reset,
  };
};

export default useExpenseSubmit;