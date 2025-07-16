'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/common/Toast';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import { 
  expenseApproverSettingApi,
  type ExpenseApproverSetting,
  type ExpenseApproverSettingHistory,
  type CreateExpenseApproverSettingRequest,
  type UpdateExpenseApproverSettingRequest,
} from '@/lib/api/expenseApproverSetting';
import { userApi } from '@/lib/api/user';
import { DebugLogger } from '@/lib/debug/logger';

// クエリキー
export const EXPENSE_APPROVER_SETTING_QUERY_KEYS = {
  all: ['expenseApproverSettings'] as const,
  settings: (approvalType?: string) => [...EXPENSE_APPROVER_SETTING_QUERY_KEYS.all, 'settings', approvalType] as const,
  histories: (filters?: any) => [...EXPENSE_APPROVER_SETTING_QUERY_KEYS.all, 'histories', filters] as const,
  users: () => [...EXPENSE_APPROVER_SETTING_QUERY_KEYS.all, 'users'] as const,
};

// ユーザー情報型
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * 経費承認者設定管理フック
 */
export function useExpenseApproverAdmin() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { handleSubmissionError } = useEnhancedErrorHandler();
  
  // 承認者設定一覧の取得
  const {
    data: settingsData,
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: EXPENSE_APPROVER_SETTING_QUERY_KEYS.settings(),
    queryFn: () => expenseApproverSettingApi.getApproverSettings(),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5分
  });

  // 承認者設定履歴の取得
  const {
    data: historiesData,
    isLoading: isLoadingHistories,
    error: historiesError,
    refetch: refetchHistories,
  } = useQuery({
    queryKey: EXPENSE_APPROVER_SETTING_QUERY_KEYS.histories(),
    queryFn: () => expenseApproverSettingApi.getApproverSettingHistories(),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5分
  });

  // ユーザー一覧の取得
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: EXPENSE_APPROVER_SETTING_QUERY_KEYS.users(),
    queryFn: async () => {
      // 管理者とマネージャーのみを取得
      const response = await userApi.getUsers({ 
        roles: ['admin', 'manager'],
        limit: 100,
      });
      return response.items;
    },
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10分
  });

  // 承認者設定作成
  const createMutation = useMutation({
    mutationFn: (request: CreateExpenseApproverSettingRequest) => 
      expenseApproverSettingApi.createApproverSetting(request),
    onSuccess: (data) => {
      DebugLogger.log('EXPENSE_APPROVER_ADMIN', 'Setting created successfully', { id: data.id });
      showSuccess('承認者設定を作成しました');
      
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: EXPENSE_APPROVER_SETTING_QUERY_KEYS.all });
    },
    onError: (error) => {
      DebugLogger.error('EXPENSE_APPROVER_ADMIN', 'Failed to create setting', error);
      handleSubmissionError(error, '承認者設定作成');
    },
  });

  // 承認者設定更新
  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateExpenseApproverSettingRequest }) => 
      expenseApproverSettingApi.updateApproverSetting(id, request),
    onSuccess: (data) => {
      DebugLogger.log('EXPENSE_APPROVER_ADMIN', 'Setting updated successfully', { id: data.id });
      showSuccess('承認者設定を更新しました');
      
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: EXPENSE_APPROVER_SETTING_QUERY_KEYS.all });
    },
    onError: (error) => {
      DebugLogger.error('EXPENSE_APPROVER_ADMIN', 'Failed to update setting', error);
      handleSubmissionError(error, '承認者設定更新');
    },
  });

  // 承認者設定削除
  const deleteMutation = useMutation({
    mutationFn: (settingId: string) => 
      expenseApproverSettingApi.deleteApproverSetting(settingId),
    onSuccess: (_, settingId) => {
      DebugLogger.log('EXPENSE_APPROVER_ADMIN', 'Setting deleted successfully', { settingId });
      showSuccess('承認者設定を削除しました');
      
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: EXPENSE_APPROVER_SETTING_QUERY_KEYS.all });
    },
    onError: (error) => {
      DebugLogger.error('EXPENSE_APPROVER_ADMIN', 'Failed to delete setting', error);
      handleSubmissionError(error, '承認者設定削除');
    },
  });

  // ヘルパー関数
  const formatDateTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getApprovalTypeLabel = useCallback((type: 'manager' | 'executive') => {
    return type === 'manager' ? '管理部承認' : '役員承認';
  }, []);

  const getActionLabel = useCallback((action: string) => {
    switch (action) {
      case 'create': return '作成';
      case 'update': return '更新';
      case 'delete': return '削除';
      default: return action;
    }
  }, []);

  // 承認者設定をタイプ別に分類
  const settingsByType = settingsData?.settings.reduce((acc, setting) => {
    if (!acc[setting.approvalType]) {
      acc[setting.approvalType] = [];
    }
    acc[setting.approvalType].push(setting);
    return acc;
  }, {} as Record<string, ExpenseApproverSetting[]>) || {};

  // アクティブな承認者設定のみを取得
  const activeSettings = settingsData?.settings.filter(setting => setting.isActive) || [];

  return {
    // データ
    settings: settingsData?.settings || [],
    settingsByType,
    activeSettings,
    histories: historiesData?.histories || [],
    totalHistories: historiesData?.total || 0,
    users: usersData || [],
    
    // ローディング状態
    isLoading: isLoadingSettings,
    isLoadingHistories,
    isLoadingUsers,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // エラー状態
    error: settingsError || historiesError || usersError,
    
    // ミューテーション関数
    createSetting: createMutation.mutate,
    updateSetting: (id: string, request: UpdateExpenseApproverSettingRequest) =>
      updateMutation.mutate({ id, request }),
    deleteSetting: deleteMutation.mutate,
    
    // 再取得関数
    refetch: refetchSettings,
    refetchHistories,
    
    // ヘルパー関数
    formatDateTime,
    getApprovalTypeLabel,
    getActionLabel,
  };
}

/**
 * 承認者設定フォーム管理フック
 */
export function useExpenseApproverForm() {
  const [formData, setFormData] = useState<CreateExpenseApproverSettingRequest>({
    approvalType: 'manager',
    approverId: '',
    isActive: true,
    priority: 1,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // フォームデータ更新
  const updateFormData = useCallback((updates: Partial<CreateExpenseApproverSettingRequest>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    
    // エラーをクリア
    const newErrors = { ...errors };
    Object.keys(updates).forEach(key => {
      delete newErrors[key];
    });
    setErrors(newErrors);
  }, [errors]);

  // フォームリセット
  const resetForm = useCallback(() => {
    setFormData({
      approvalType: 'manager',
      approverId: '',
      isActive: true,
      priority: 1,
    });
    setErrors({});
  }, []);

  // 編集用データローダー
  const loadEditData = useCallback((setting: ExpenseApproverSetting) => {
    setFormData({
      approvalType: setting.approvalType,
      approverId: setting.approverId,
      isActive: setting.isActive,
      priority: setting.priority,
    });
    setErrors({});
  }, []);

  // バリデーション
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.approverId) {
      newErrors.approverId = '承認者を選択してください';
    }

    if (!formData.priority || formData.priority < 1 || formData.priority > 99) {
      newErrors.priority = '優先順位は1-99の範囲で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 送信データ作成
  const getSubmitData = useCallback(() => {
    if (!validate()) {
      return null;
    }
    return formData;
  }, [formData, validate]);

  // バリデーション状態
  const isValid = Object.keys(errors).length === 0 && !!formData.approverId;

  return {
    formData,
    errors,
    updateFormData,
    resetForm,
    loadEditData,
    validate,
    getSubmitData,
    isValid,
  };
}