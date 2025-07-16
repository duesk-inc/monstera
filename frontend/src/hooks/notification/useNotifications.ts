import { useState, useCallback } from 'react';
import { 
  getUserNotifications, 
  markNotificationsAsRead
} from '@/lib/api/notification';
import { 
  UserNotification, 
  NotificationType 
} from '@/types/notification';
import { parseISO, format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAbortableEffect } from '@/hooks/common/useAbortableEffect';
import { AbortError } from '@/lib/api/error';

interface UseNotificationsOptions {
  defaultLimit?: number;
  defaultOffset?: number;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { defaultLimit = 10, defaultOffset = 0 } = options;

  // 通知データの状態
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ページネーション用の状態
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);
  const [offset, setOffset] = useState(defaultOffset);

  // フィルター用の状態
  const [selectedTypes, setSelectedTypes] = useState<NotificationType[]>([]);

  // 通知を取得する（内部用）
  const loadNotifications = useCallback(async (
    pageLimit: number,
    pageOffset: number,
    signal?: AbortSignal
  ) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getUserNotifications(pageLimit, pageOffset, signal);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setTotalCount(data.totalCount);
      return data;
    } catch (err) {
      // AbortErrorの場合は静かに処理（エラー状態を設定しない）
      if (err instanceof AbortError) {
        return;
      }
      
      // DOMExceptionのAbortErrorも処理
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : '通知の取得に失敗しました';
      console.error('通知の取得に失敗しました', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回データ取得
  useAbortableEffect(async (signal) => {
    await loadNotifications(defaultLimit, defaultOffset, signal);
  }, [], {
    retryCount: 3,
    retryDelay: 1000,
  });

  // 通知を取得する（外部公開用）
  const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
    return await loadNotifications(limit, offset, signal);
  }, [limit, offset, loadNotifications]);

  // ページ変更時に通知を再取得
  const handlePageChange = useCallback(async (newPage: number) => {
    const newOffset = (newPage - 1) * limit;
    setPage(newPage);
    setOffset(newOffset);
    await loadNotifications(limit, newOffset);
  }, [limit, loadNotifications]);

  // 表示件数変更時に通知を再取得
  const handleLimitChange = useCallback(async (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    setOffset(0);
    await loadNotifications(newLimit, 0);
  }, [loadNotifications]);

  // 通知を既読にする
  const markAsRead = useCallback(async (notificationId: string, signal?: AbortSignal) => {
    try {
      setError(null);
      await markNotificationsAsRead([notificationId], signal);
      // UIを更新
      setNotifications(prev => 
        prev.map(notification => 
          notification.notification.id === notificationId 
            ? { ...notification, isRead: true, readAt: new Date().toISOString() } 
            : notification
        )
      );
      // 未読カウントを減らす
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // AbortErrorの場合は静かに処理
      if (err instanceof AbortError) {
        return;
      }
      
      // DOMExceptionのAbortErrorも処理
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : '通知の既読化に失敗しました';
      console.error('通知の既読化に失敗しました', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  // すべての通知を既読にする
  const markAllAsRead = useCallback(async (signal?: AbortSignal) => {
    if (unreadCount === 0) return;
    
    try {
      setError(null);
      // 現在の未読通知のIDを取得
      const unreadNotificationIds = notifications
        .filter(notification => !notification.isRead)
        .map(notification => notification.notification.id);
      
      if (unreadNotificationIds.length > 0) {
        await markNotificationsAsRead(unreadNotificationIds, signal);
      }
      
      // すべての通知を既読に更新
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString()
        }))
      );
      // 未読カウントをリセット
      setUnreadCount(0);
    } catch (err) {
      // AbortErrorの場合は静かに処理
      if (err instanceof AbortError) {
        return;
      }
      
      // DOMExceptionのAbortErrorも処理
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : '通知の一括既読化に失敗しました';
      console.error('通知の一括既読化に失敗しました', err);
      setError(errorMessage);
      throw err;
    }
  }, [unreadCount, notifications]);

  // 選択された通知タイプでフィルター
  const filterByType = useCallback((types: NotificationType[]) => {
    setSelectedTypes(types);
  }, []);

  // 通知タイプの日本語名を取得
  const getNotificationTypeName = useCallback((type: NotificationType): string => {
    switch (type) {
      case 'leave':
        return '休暇';
      case 'expense':
        return '経費';
      case 'weekly':
        return '週報';
      case 'project':
        return 'プロジェクト';
      case 'system':
        return 'システム';
      default:
        return '不明';
    }
  }, []);

  // 通知のリンク先を取得する関数
  const getNotificationLink = useCallback((notification: UserNotification): string => {
    const type = notification.notification.notificationType;
    const id = notification.notification.id;
    const referenceId = notification.notification.referenceId; // 参照ID
    
    switch (type) {
      case 'leave':
        // 勤怠：休暇申請画面で、申請履歴タブを選択した状態
        return '/leave?from=notification';
      case 'expense':
        // 経費：経費申請画面で、申請履歴タブを選択した状態
        return '/expense?from=notification';
      case 'weekly':
        // 週報：週報画面で、提出期限の対象週の画面を表示
        // reference_idがあればそれを使用、なければ現在の日付
        return referenceId ? `/weekly-report?date=${referenceId}&from=notification` : '/weekly-report?from=notification';
      case 'project':
        // プロジェクト：案件情報画面で、対象案件の詳細画面を表示
        return referenceId ? `/projects/${referenceId}?from=notification` : '/projects?from=notification';
      case 'system':
      default:
        // システム：/notifications/[id]画面でシステム通知データのidごとに生成される画面を表示
        return `/notifications/${id}`;
    }
  }, []);

  // 通知の日付をフォーマットする関数
  const formatDate = useCallback((dateString: string, short: boolean = false) => {
    try {
      const date = parseISO(dateString);
      
      if (short) {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          return '今日';
        } else if (diffDays === 1) {
          return '昨日';
        } else if (diffDays < 7) {
          return `${diffDays}日前`;
        } else {
          return format(date, 'M月d日', { locale: ja });
        }
      }
      
      return format(date, 'yyyy年M月d日 HH:mm', { locale: ja });
    } catch (error) {
      console.error('日付のフォーマットに失敗しました', error);
      return '不明な日付';
    }
  }, []);

  // フィルター済みの通知リスト
  const filteredNotifications = selectedTypes.length > 0
    ? notifications.filter(notification => 
        selectedTypes.includes(notification.notification.notificationType)
      )
    : notifications;

  return {
    // データ
    notifications: filteredNotifications,
    unreadCount,
    totalCount,
    
    // 状態
    loading,
    error,
    page,
    limit,
    
    // アクション
    fetchNotifications,
    handlePageChange,
    handleLimitChange,
    markAsRead,
    markAllAsRead,
    filterByType,
    
    // ユーティリティ
    getNotificationTypeName,
    getNotificationLink,
    formatDate,
    
    // フィルター
    selectedTypes,
    setSelectedTypes,
  };
}; 