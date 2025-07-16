// 経費申請のサブミット処理を行うカスタムフック

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// 経費申請データの型定義
interface ExpenseSubmission {
  id?: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod: string;
  currency: string;
  taxRate: number;
  receiptFiles?: File[];
  projectId?: string;
  clientId?: string;
  isBusinessTrip?: boolean;
}

// API レスポンスの型定義
interface ExpenseSubmissionResponse {
  id: string;
  status: string;
  message: string;
  submittedAt: string;
}

// エラーの型定義
interface ExpenseSubmissionError {
  message: string;
  field?: string;
  code?: string;
}

// Hook のオプション
interface UseExpenseSubmitOptions {
  onSuccess?: (data: ExpenseSubmissionResponse) => void;
  onError?: (error: ExpenseSubmissionError) => void;
}

// Hook の戻り値
interface UseExpenseSubmitReturn {
  submitExpense: (data: ExpenseSubmission) => Promise<void>;
  isSubmitting: boolean;
  error: ExpenseSubmissionError | null;
  isSuccess: boolean;
  reset: () => void;
}

// 経費申請のAPI呼び出し（モック実装）
const submitExpenseAPI = async (data: ExpenseSubmission): Promise<ExpenseSubmissionResponse> => {
  // TODO: 実際のAPI呼び出しに置き換える
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機（API呼び出しをシミュレート）
  
  // バリデーション
  if (!data.category) {
    throw new Error('カテゴリを選択してください');
  }
  if (!data.amount || data.amount <= 0) {
    throw new Error('金額を正しく入力してください');
  }
  if (!data.date) {
    throw new Error('日付を選択してください');
  }
  if (!data.description) {
    throw new Error('説明を入力してください');
  }
  
  // 成功レスポンスを返す
  return {
    id: `expense_${Date.now()}`,
    status: 'submitted',
    message: '経費申請が正常に提出されました',
    submittedAt: new Date().toISOString(),
  };
};

// 経費申請のサブミット処理を行うカスタムフック
export const useExpenseSubmit = (options: UseExpenseSubmitOptions = {}): UseExpenseSubmitReturn => {
  const [error, setError] = useState<ExpenseSubmissionError | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: submitExpenseAPI,
    onSuccess: (data) => {
      setIsSuccess(true);
      setError(null);
      
      // 経費一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      
      // 成功コールバックを実行
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || '経費申請の提出に失敗しました';
      const expenseError: ExpenseSubmissionError = {
        message: errorMessage,
        code: error.code,
        field: error.field,
      };
      
      setError(expenseError);
      setIsSuccess(false);
      
      // エラーコールバックを実行
      if (options.onError) {
        options.onError(expenseError);
      }
    },
  });

  const submitExpense = useCallback(async (data: ExpenseSubmission) => {
    setError(null);
    setIsSuccess(false);
    
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      // エラーはmutationのonErrorで処理済み
      console.error('Expense submission error:', error);
    }
  }, [mutation]);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
    mutation.reset();
  }, [mutation]);

  return {
    submitExpense,
    isSubmitting: mutation.isPending,
    error,
    isSuccess,
    reset,
  };
};

export default useExpenseSubmit;