import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useToast } from '@/components/common/Toast';
import { alertApi } from '@/lib/api/admin/alert';
import {
  AlertSettings,
  CreateAlertSettingsRequest,
  UpdateAlertSettingsRequest,
  AlertFilters,
} from '@/types/admin/alert';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import { CACHE_STRATEGIES, QUERY_KEYS } from '@/constants/cache';
import { cacheUtils } from '@/lib/query-client';

/**
 * キャッシュ最適化されたアラート設定フック
 * 
 * 特徴:
 * - 適切なキャッシュ戦略（5分間キャッシュ）
 * - インテリジェントなプリロード
 * - 楽観的更新によるUX向上
 * - 戦略的キャッシュ無効化
 */
export const useCachedAlertSettings = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const { handleSubmissionError } = useEnhancedErrorHandler();

  // 現在のアラート設定を取得（システム全体で1つ）
  const {
    data: alertSettings,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [...QUERY_KEYS.ALERT_SETTINGS],
    queryFn: async () => {
      const response = await alertApi.getCurrentAlertSettings();
      return response;
    },
    staleTime: CACHE_STRATEGIES.ALERT_SETTINGS.staleTime, // 5分間キャッシュ
    gcTime: CACHE_STRATEGIES.ALERT_SETTINGS.gcTime, // 10分間メモリ保持
    refetchOnWindowFocus: false, // 設定データなので頻繁な再取得は不要
    retry: 2, // エラー時は2回までリトライ
  });

  // アラート設定履歴を取得（ページネーション対応）
  const useAlertHistoriesWithCache = useCallback((filters: AlertFilters = {}, page = 1, limit = 20) => {
    return useQuery({
      queryKey: [...QUERY_KEYS.ALERT_SETTINGS, 'histories', filters, page, limit],
      queryFn: () => alertApi.getAlertHistories(filters, page, limit),
      staleTime: CACHE_STRATEGIES.ALERT_SETTINGS.staleTime, // 5分間キャッシュ
      gcTime: CACHE_STRATEGIES.ALERT_SETTINGS.gcTime,
      enabled: !!alertSettings, // アラート設定が存在する場合のみ実行
    });
  }, [alertSettings]);

  // アラートサマリーを取得（ダッシュボード用）
  const {
    data: alertSummary,
    isLoading: isSummaryLoading,
  } = useQuery({
    queryKey: [...QUERY_KEYS.ALERT_SETTINGS, 'summary'],
    queryFn: () => alertApi.getAlertSummary(),
    staleTime: CACHE_STRATEGIES.ALERT_SETTINGS.staleTime,
    gcTime: CACHE_STRATEGIES.ALERT_SETTINGS.gcTime,
    enabled: !!alertSettings,
  });

  // アラート設定更新（楽観的更新）
  const updateAlertSettingsMutation = useMutation({
    mutationFn: async (data: UpdateAlertSettingsRequest) => {
      if (!alertSettings?.id) {
        throw new Error('アラート設定IDが見つかりません');
      }
      return alertApi.updateAlertSettings(alertSettings.id, data);
    },
    
    // 楽観的更新: APIレスポンス前にUIを更新
    onMutate: async (newData) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.ALERT_SETTINGS });

      // 現在の値を保存（ロールバック用）
      const previousSettings = queryClient.getQueryData(QUERY_KEYS.ALERT_SETTINGS);

      // 楽観的にキャッシュを更新
      if (alertSettings) {
        queryClient.setQueryData(QUERY_KEYS.ALERT_SETTINGS, {
          ...alertSettings,
          ...newData,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousSettings };
    },

    onSuccess: (updatedSettings) => {
      // 実際のデータでキャッシュを更新
      queryClient.setQueryData(QUERY_KEYS.ALERT_SETTINGS, updatedSettings);
      
      // 関連するクエリも無効化（アラート履歴など）
      queryClient.invalidateQueries({ 
        queryKey: [...QUERY_KEYS.ALERT_SETTINGS, 'histories'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [...QUERY_KEYS.ALERT_SETTINGS, 'summary'] 
      });
      
      showSuccess('アラート設定を更新しました');
    },

    onError: (error, newData, context) => {
      // エラー時は元の値にロールバック
      if (context?.previousSettings) {
        queryClient.setQueryData(QUERY_KEYS.ALERT_SETTINGS, context.previousSettings);
      }
      handleSubmissionError(error, 'アラート設定更新');
    },

    onSettled: () => {
      // 最終的にサーバーから最新データを取得
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERT_SETTINGS });
    },
  });

  // アラート設定作成（初回セットアップ用）
  const createAlertSettingsMutation = useMutation({
    mutationFn: (data: CreateAlertSettingsRequest) => alertApi.createAlertSettings(data),
    onSuccess: (newSettings) => {
      // 新しい設定をキャッシュに保存
      queryClient.setQueryData(QUERY_KEYS.ALERT_SETTINGS, newSettings);
      showSuccess('アラート設定を作成しました');
    },
    onError: (error) => {
      handleSubmissionError(error, 'アラート設定作成');
    },
  });

  // アラートステータス更新（履歴の解決など）
  const updateAlertStatusMutation = useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: string; comment?: string }) =>
      alertApi.updateAlertStatus(id, { status: status as any, comment }),
    onSuccess: () => {
      // 履歴とサマリーのキャッシュを無効化
      queryClient.invalidateQueries({ 
        queryKey: [...QUERY_KEYS.ALERT_SETTINGS, 'histories'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [...QUERY_KEYS.ALERT_SETTINGS, 'summary'] 
      });
      showSuccess('アラートステータスを更新しました');
    },
    onError: (error) => {
      handleSubmissionError(error, 'アラートステータス更新');
    },
  });

  // 戦略的プリロード
  const preloadRelatedData = useCallback(async () => {
    if (!alertSettings) return;

    try {
      // アラートサマリーをプリロード
      await cacheUtils.prefetchQuery(
        [...QUERY_KEYS.ALERT_SETTINGS, 'summary'],
        () => alertApi.getAlertSummary(),
        CACHE_STRATEGIES.ALERT_SETTINGS
      );

      // 最新のアラート履歴をプリロード（最初のページ）
      await cacheUtils.prefetchQuery(
        [...QUERY_KEYS.ALERT_SETTINGS, 'histories', {}, 1, 20],
        () => alertApi.getAlertHistories({}, 1, 20),
        CACHE_STRATEGIES.ALERT_SETTINGS
      );
    } catch (error) {
      // プリロードエラーは無視（バックグラウンド処理のため）
      console.warn('Failed to preload alert data:', error);
    }
  }, [alertSettings]);

  // キャッシュクリア機能（管理者用）
  const clearAlertCache = useCallback(() => {
    cacheUtils.removeQueries(QUERY_KEYS.ALERT_SETTINGS);
    showSuccess('アラート設定のキャッシュをクリアしました');
  }, [showSuccess]);

  // 強制リフレッシュ
  const forceRefresh = useCallback(async () => {
    cacheUtils.invalidateQueries(QUERY_KEYS.ALERT_SETTINGS);
    await refetch();
  }, [refetch]);

  // 計算値: アラート設定の状態
  const alertSettingsStatus = useMemo(() => {
    if (!alertSettings) return 'not_configured';
    
    const {
      weekly_hours_limit,
      weekly_hours_change_limit,
      consecutive_holiday_work_limit,
      monthly_overtime_limit,
    } = alertSettings;

    // 設定値が適切な範囲にあるかチェック
    const isValidConfig = 
      weekly_hours_limit > 0 && weekly_hours_limit <= 80 &&
      weekly_hours_change_limit > 0 && weekly_hours_change_limit <= 40 &&
      consecutive_holiday_work_limit > 0 && consecutive_holiday_work_limit <= 10 &&
      monthly_overtime_limit > 0 && monthly_overtime_limit <= 150;

    return isValidConfig ? 'configured' : 'invalid_config';
  }, [alertSettings]);

  // 設定値の妥当性チェック
  const validateSettings = useCallback((settings: Partial<UpdateAlertSettingsRequest>) => {
    const errors: Record<string, string> = {};

    if (settings.weekly_hours_limit !== undefined) {
      if (settings.weekly_hours_limit <= 0 || settings.weekly_hours_limit > 80) {
        errors.weekly_hours_limit = '週間労働時間上限は1〜80時間の範囲で設定してください';
      }
    }

    if (settings.weekly_hours_change_limit !== undefined) {
      if (settings.weekly_hours_change_limit <= 0 || settings.weekly_hours_change_limit > 40) {
        errors.weekly_hours_change_limit = '週間労働時間変動上限は1〜40時間の範囲で設定してください';
      }
    }

    if (settings.consecutive_holiday_work_limit !== undefined) {
      if (settings.consecutive_holiday_work_limit <= 0 || settings.consecutive_holiday_work_limit > 10) {
        errors.consecutive_holiday_work_limit = '連続休日出勤上限は1〜10日の範囲で設定してください';
      }
    }

    if (settings.monthly_overtime_limit !== undefined) {
      if (settings.monthly_overtime_limit <= 0 || settings.monthly_overtime_limit > 150) {
        errors.monthly_overtime_limit = '月間残業時間上限は1〜150時間の範囲で設定してください';
      }
    }

    return errors;
  }, []);

  return {
    // データ
    alertSettings,
    alertSummary,
    alertSettingsStatus,

    // 状態
    isLoading,
    isSummaryLoading,
    isError,
    error,
    isUpdating: updateAlertSettingsMutation.isPending,
    isCreating: createAlertSettingsMutation.isPending,
    isUpdatingStatus: updateAlertStatusMutation.isPending,

    // アクション
    updateAlertSettings: updateAlertSettingsMutation.mutateAsync,
    createAlertSettings: createAlertSettingsMutation.mutateAsync,
    updateAlertStatus: updateAlertStatusMutation.mutateAsync,

    // フック
    useAlertHistoriesWithCache,

    // ユーティリティ
    refetch,
    forceRefresh,
    preloadRelatedData,
    clearAlertCache,
    validateSettings,
  };
};