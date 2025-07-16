import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { expenseLimitApi, type ExpenseLimit, type UpdateExpenseLimitRequest } from '@/lib/api/expenseLimit';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import { useToast } from '@/components/common';

/**
 * 経費申請上限管理のカスタムフック
 */
export function useExpenseLimitAdmin() {
  const queryClient = useQueryClient();
  const { handleSubmissionError } = useEnhancedErrorHandler();
  const { showSuccess } = useToast();

  // 上限一覧を取得
  const {
    data: limits,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'expense-limits'],
    queryFn: () => expenseLimitApi.getExpenseLimits(),
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分後にキャッシュをクリア
    retry: 2,
    retryDelay: 1000,
  });

  // 上限更新のミューテーション
  const updateMutation = useMutation({
    mutationFn: (request: UpdateExpenseLimitRequest) => expenseLimitApi.updateExpenseLimit(request),
    onSuccess: (updatedLimit) => {
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['admin', 'expense-limits'] });
      queryClient.invalidateQueries({ queryKey: ['expense', 'summary'] });
      
      showSuccess(`${updatedLimit.limitType === 'monthly' ? '月次' : '年次'}上限を更新しました`, {
        title: '上限設定更新',
        duration: 4000,
      });
    },
    onError: (error) => {
      handleSubmissionError(error, '上限設定更新');
    },
  });

  // 現在の上限を取得するヘルパー関数
  const getCurrentLimits = useCallback(() => {
    if (!limits) return { monthly: null, yearly: null };

    const now = new Date();
    
    // 有効な上限を取得（effective_fromが現在より前で最新のもの）
    const monthlyLimits = limits
      .filter(limit => limit.limitType === 'monthly' && new Date(limit.effectiveFrom) <= now)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    
    const yearlyLimits = limits
      .filter(limit => limit.limitType === 'yearly' && new Date(limit.effectiveFrom) <= now)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

    return {
      monthly: monthlyLimits[0] || null,
      yearly: yearlyLimits[0] || null,
    };
  }, [limits]);

  // 上限更新
  const updateLimit = useCallback(
    (request: UpdateExpenseLimitRequest) => {
      updateMutation.mutate(request);
    },
    [updateMutation]
  );

  // フォーマット用ユーティリティ
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  }, []);

  const formatDateTime = useCallback((dateTimeString: string): string => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateTimeString));
  }, []);

  return {
    // データ
    limits: limits || [],
    currentLimits: getCurrentLimits(),
    
    // 状態
    isLoading,
    error,
    isUpdating: updateMutation.isPending,
    
    // アクション
    updateLimit,
    refetch,
    
    // ユーティリティ
    formatCurrency,
    formatDateTime,
  };
}

/**
 * 上限管理フォーム用のカスタムフック
 */
export function useExpenseLimitForm() {
  const [formData, setFormData] = useState<{
    limitType: 'monthly' | 'yearly';
    amount: string;
    effectiveFrom: string;
  }>({
    limitType: 'monthly',
    amount: '',
    effectiveFrom: '',
  });

  const [errors, setErrors] = useState<{
    amount?: string;
    effectiveFrom?: string;
  }>({});

  // バリデーション
  const validateForm = useCallback(() => {
    const newErrors: typeof errors = {};

    // 金額チェック
    const amount = parseInt(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = '金額は1円以上で入力してください';
    } else if (amount > 100000000) {
      newErrors.amount = '金額は1億円以下で入力してください';
    }

    // 有効開始日時チェック
    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = '有効開始日時を選択してください';
    } else {
      const effectiveDate = new Date(formData.effectiveFrom);
      const now = new Date();
      if (effectiveDate < now) {
        newErrors.effectiveFrom = '有効開始日時は現在時刻以降を選択してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // フォームデータ更新
  const updateFormData = useCallback((updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // フォームリセット
  const resetForm = useCallback(() => {
    setFormData({
      limitType: 'monthly',
      amount: '',
      effectiveFrom: '',
    });
    setErrors({});
  }, []);

  // 現在の設定を読み込み
  const loadCurrentLimit = useCallback((limit: ExpenseLimit | null) => {
    if (limit) {
      setFormData({
        limitType: limit.limitType,
        amount: limit.amount.toString(),
        effectiveFrom: new Date(Date.now() + 60000).toISOString().slice(0, 16), // 1分後
      });
    }
    setErrors({});
  }, []);

  // 送信データの取得
  const getSubmitData = useCallback((): UpdateExpenseLimitRequest | null => {
    if (!validateForm()) return null;

    return {
      limitType: formData.limitType,
      amount: parseInt(formData.amount),
      effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
    };
  }, [formData, validateForm]);

  return {
    formData,
    errors,
    updateFormData,
    resetForm,
    loadCurrentLimit,
    validateForm,
    getSubmitData,
    isValid: Object.keys(errors).length === 0 && formData.amount && formData.effectiveFrom,
  };
}