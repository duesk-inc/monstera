import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import { QUERY_KEYS } from '@/constants/cache';

interface Notification {
  id: string;
  type: 'weekly_report_reminder' | 'alert' | 'announcement';
  title: string;
  message: string;
  created_at: string;
  read_at?: string;
  related_id?: string;
  severity?: 'info' | 'warning' | 'error';
}

interface NotificationResponse {
  notifications: Notification[];
  unread_count: number;
}

const POLLING_INTERVAL = 30000; // 30秒（設計書準拠）

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPollingEnabled, setIsPollingEnabled] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 未読通知を取得
  const {
    data: notificationData,
    isLoading,
    error,
    refetch,
  } = useQuery<NotificationResponse>({
    queryKey: QUERY_KEYS.NOTIFICATIONS.UNREAD,
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/notifications/unread');
      return response.data;
    },
    enabled: !!user && isPollingEnabled,
    staleTime: 60 * 1000, // 1分（リアルタイム性重視）
    gcTime: 2 * 60 * 1000, // 2分
    refetchInterval: POLLING_INTERVAL, // 30秒間隔でポーリング
    refetchIntervalInBackground: false, // バックグラウンドではポーリングしない
  });

  // 通知を既読にする
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.put(`/api/v1/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      // 通知関連のクエリを無効化（即座に最新状態を反映）
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS.ALL });
    },
  });

  // 全ての通知を既読にする
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notificationData?.notifications || [];
      const promises = unreadNotifications.map((notification) =>
        apiClient.put(`/api/v1/notifications/${notification.id}/read`)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      // 通知関連のクエリを無効化
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS.ALL });
    },
  });

  // ポーリングの開始
  const startPolling = useCallback(() => {
    if (!user || !isPollingEnabled) return;

    // 既存のポーリングをクリア
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // 新しいポーリングを開始
    pollingIntervalRef.current = setInterval(() => {
      refetch();
    }, POLLING_INTERVAL);
  }, [user, isPollingEnabled, refetch]);

  // ポーリングの停止
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // ポーリングの一時停止/再開
  const togglePolling = useCallback(() => {
    setIsPollingEnabled((prev) => !prev);
  }, []);

  // コンポーネントマウント時にポーリング開始
  useEffect(() => {
    if (user && isPollingEnabled) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [user, isPollingEnabled, startPolling, stopPolling]);

  // ページ可視性の変化を監視
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (user && isPollingEnabled) {
        refetch(); // 即座に最新データを取得
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isPollingEnabled, stopPolling, startPolling, refetch]);

  // 通知をタイプ別にフィルタリング
  const filterNotificationsByType = useCallback(
    (type: Notification['type']) => {
      return notificationData?.notifications.filter((n) => n.type === type) || [];
    },
    [notificationData]
  );

  // 重要度別にフィルタリング
  const filterNotificationsBySeverity = useCallback(
    (severity: 'info' | 'warning' | 'error') => {
      return notificationData?.notifications.filter((n) => n.severity === severity) || [];
    },
    [notificationData]
  );

  return {
    // データ
    notifications: notificationData?.notifications || [],
    unreadCount: notificationData?.unread_count || 0,
    hasUnread: (notificationData?.unread_count || 0) > 0,

    // 状態
    isLoading,
    error,
    isPollingEnabled,

    // アクション
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    refresh: refetch,
    togglePolling,
    
    // フィルタリング
    filterNotificationsByType,
    filterNotificationsBySeverity,
    
    // ローディング状態
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
};

// 通知タイプの表示名を取得
export const getNotificationTypeLabel = (type: Notification['type']): string => {
  switch (type) {
    case 'weekly_report_reminder':
      return '週報リマインド';
    case 'alert':
      return 'アラート';
    case 'announcement':
      return 'お知らせ';
    default:
      return '通知';
  }
};

// 通知の重要度に応じた色を取得
export const getNotificationSeverityColor = (severity?: Notification['severity']): string => {
  switch (severity) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
};