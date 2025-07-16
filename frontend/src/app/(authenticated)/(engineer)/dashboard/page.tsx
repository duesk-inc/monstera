'use client';

import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  useTheme,
  List,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  MoreVert as MoreVertIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/notification/useNotifications';
import { UserNotification } from '@/types/notification';
import ActionButton from '@/components/common/ActionButton';
import { NotificationBadge, NotificationItem, PageContainer, PageHeader, ContentCard } from '@/components/common';
import { DebugLogger, DEBUG_CATEGORIES, DEBUG_OPERATIONS } from '@/lib/debug/logger';
import ExpenseDashboardCard from '@/components/dashboard/ExpenseDashboardCard';

export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  
  // 通知フックを使用する
  const { 
    notifications, 
    unreadCount, 
    loading: notificationLoading, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead, 
    formatDate,
    error: notificationError
  } = useNotifications({ defaultLimit: 5 });

  // 通知タイプに応じた画面遷移先を取得するカスタム関数
  const getCustomNotificationLink = (notification: UserNotification) => {
    const type = notification.notification.notificationType;
    const id = notification.notification.id;
    const targetId = notification.notification.referenceId; // 対象IDがある場合
    
    DebugLogger.debug(
      { 
        category: DEBUG_CATEGORIES.UI, 
        operation: DEBUG_OPERATIONS.NAVIGATE,
        description: '通知リンク生成' 
      },
      '通知データ解析',
      {
        type,
        id,
        targetId,
        notification: notification.notification
      }
    );
    
    switch (type) {
      case 'leave':
        // 勤怠：休暇申請画面で、申請履歴タブを選択した状態
        // &from=notificationを使用して休暇申請画面に遷移
        const leaveUrl = '/leave?tab=history&from=notification';
        DebugLogger.debug(
          { 
            category: DEBUG_CATEGORIES.UI, 
            operation: DEBUG_OPERATIONS.NAVIGATE,
            description: '休暇通知リンク生成' 
          },
          '休暇通知URL生成',
          { leaveUrl }
        );
        return leaveUrl;
      case 'expense':
        // 経費：経費申請画面で、申請履歴タブを選択した状態
        return '/expense?from=notification';
      case 'weekly':
        // 週報：週報画面で、提出期限の対象週の画面を表示
        // target_idがあればそれを使用、なければ現在の日付
        return targetId ? `/weekly-report?date=${targetId}&from=notification` : '/weekly-report?from=notification';
      case 'project':
        // プロジェクト：案件情報画面で、対象案件の詳細画面を表示
        return targetId ? `/projects/${targetId}?from=notification` : '/projects?from=notification';
      case 'system':
      default:
        // システム：/notifications/[id]画面でシステム通知データのidごとに生成される画面を表示
        const systemUrl = `/notifications/${id}`;
        DebugLogger.debug(
          { 
            category: DEBUG_CATEGORIES.UI, 
            operation: DEBUG_OPERATIONS.NAVIGATE,
            description: 'システム通知リンク生成' 
          },
          'システム通知URL生成',
          { systemUrl }
        );
        return systemUrl;
    }
  };

  // 通知クリック時の処理
  const handleNotificationClick = async (notification: UserNotification, event: React.MouseEvent) => {
    event.preventDefault(); // デフォルトのLink動作を防ぐ
    
    // 未読の場合は既読にする
    if (!notification.isRead) {
      try {
        await markAsRead(notification.notification.id);
      } catch (error) {
        DebugLogger.apiError(
          { 
            category: DEBUG_CATEGORIES.API, 
            operation: DEBUG_OPERATIONS.UPDATE,
            description: '通知既読化' 
          },
          { 
            error: error as Error,
            metadata: { notificationId: notification.notification.id }
          }
        );
      }
    }
    
    // カスタムリンクに遷移
    const targetUrl = getCustomNotificationLink(notification);
    DebugLogger.debug(
      { 
        category: DEBUG_CATEGORIES.UI, 
        operation: DEBUG_OPERATIONS.NAVIGATE,
        description: '通知クリック遷移' 
      },
      '遷移先URL決定',
      { targetUrl }
    );
    router.push(targetUrl);
  };

  return (
    <PageContainer data-testid="dashboard">
      {notificationLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <PageHeader title="ダッシュボード" />
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 経費申請状況 */}
            <ExpenseDashboardCard />
            
            {/* 最新の通知 */}
            <ContentCard
              variant="elevated"
              actions={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {!notificationLoading && notifications.length > 0 && (
                    <NotificationBadge 
                      count={notifications.length} 
                      variant="chip" 
                    />
                  )}
                  {unreadCount > 0 && (
                    <ActionButton 
                      buttonType="secondary"
                      size="small" 
                      icon={<CheckIcon />}
                      onClick={() => markAllAsRead()}
                      sx={{ fontSize: theme.typography.caption.fontSize, py: 0.5, px: 1 }}
                    >
                      すべて既読
                    </ActionButton>
                  )}
                  <IconButton size="small">
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              }
            >
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <NotificationsIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight="bold">
                    最新の通知
                  </Typography>
                </Box>
              </Box>
              
              <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
                {notificationLoading ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress size={24} />
                  </Box>
                ) : notificationError ? (
                  <Box display="flex" justifyContent="center" p={4}>
                    <Box textAlign="center">
                      <Typography color="error" gutterBottom>{notificationError}</Typography>
                      <ActionButton 
                        buttonType="secondary"
                        size="small" 
                        onClick={() => fetchNotifications()}
                        sx={{ mt: 1 }}
                      >
                        再読み込み
                      </ActionButton>
                    </Box>
                  </Box>
                ) : notifications.length === 0 ? (
                  <Box display="flex" justifyContent="center" p={4}>
                    <Typography color="text.secondary">通知はありません</Typography>
                  </Box>
                ) : (
                  notifications.map((notification, index) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      variant="compact"
                      showIcon={true}
                      showTypeChip={false}
                      onClick={handleNotificationClick}
                      formatDate={formatDate}
                      index={index}
                      totalItems={notifications.length}
                    />
                  ))
                )}
              </List>
              
              {notifications.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <ActionButton 
                    component={Link} 
                    href="/notifications" 
                    buttonType="ghost"
                    sx={{ fontSize: theme.typography.body2.fontSize }}
                  >
                    すべての通知を見る
                  </ActionButton>
                </Box>
              )}
            </ContentCard>
          </Box>
        </>
      )}
    </PageContainer>
  );
} 