'use client';

import React, { useState } from 'react';
import {
  Box,
  List,
  IconButton,
  SelectChangeEvent,
} from '@mui/material';
import {
  Check as CheckIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import ActionButton from '@/components/common/ActionButton';
import { SectionLoader, NotificationBadge, CommonPagination, NotificationItem } from '@/components/common';
import { 
  PageContainer, 
  PageHeader, 
  TabContainer, 
  FilterBar, 
  EmptyState,
  type TabItem,
  type FilterOption 
} from '@/components/common/layout';

// カスタムフックをインポート
import { useNotifications } from '@/hooks/notification/useNotifications';
import { NotificationType, UserNotification } from '@/types/notification';

// 1ページあたりの表示件数
const PAGE_SIZE = 10;

export default function NotificationsPage() {
  // タブの状態
  const [tabValue, setTabValue] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');

  // useNotificationsフックを使用
  const {
    notifications,
    unreadCount,
    totalCount,
    loading,
    page,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    handlePageChange,
    filterByType,
    getNotificationLink,
    formatDate
  } = useNotifications({ defaultLimit: PAGE_SIZE });
  
  // 総ページ数を計算
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  
  // タブ変更ハンドラ
  const handleTabChange = (event: React.SyntheticEvent, newValue: string | number) => {
    const tabVal = newValue as 'all' | 'unread';
    setTabValue(tabVal);
    // フックのロジックを利用してページネーションをリセット
    handlePageChange(1);
  };
  
  // タイプフィルター変更ハンドラ
  const handleTypeFilterChange = (event: SelectChangeEvent<string | number>) => {
    const newTypeFilter = event.target.value as NotificationType | 'all';
    setTypeFilter(newTypeFilter);
    // フィルターを適用
    if (newTypeFilter === 'all') {
      filterByType([]);
    } else {
      filterByType([newTypeFilter]);
    }
    // ページをリセット
    handlePageChange(1);
  };
  
  // 通知を更新する
  const handleRefresh = () => {
    fetchNotifications();
  };
  
  // 表示する通知をフィルタリング
  const filteredNotifications = tabValue === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  // 通知クリック時の処理（未読の場合のみ既読化）
  const handleNotificationClick = (notification: UserNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.notification.id);
    }
  };

  // タブ設定
  const tabs: TabItem[] = [
    { label: 'すべて', value: 'all' },
    { 
      label: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          未読
          <NotificationBadge 
            count={unreadCount} 
            variant="chip" 
            sx={{ height: 18, fontSize: '0.7rem' }}
          />
        </Box>
      ), 
      value: 'unread' 
    },
  ];

  // フィルターオプション
  const filterOptions: FilterOption[] = [
    { value: 'all', label: 'すべて' },
    { value: 'leave', label: '休暇' },
    { value: 'expense', label: '経費' },
    { value: 'weekly', label: '週報' },
    { value: 'project', label: 'プロジェクト' },
    { value: 'system', label: 'システム' },
  ];

  // ヘッダーアクション
  const headerActions = (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <ActionButton
        buttonType="secondary"
        startIcon={<CheckIcon />}
        onClick={() => markAllAsRead()}
        disabled={loading || unreadCount === 0}
      >
        すべて既読
      </ActionButton>
      <IconButton component={Link} href="/notifications/settings">
        <SettingsIcon />
      </IconButton>
    </Box>
  );

  // タブヘッダーアクション
  const tabHeaderActions = (
    <FilterBar
      filterValue={typeFilter}
      onFilterChange={handleTypeFilterChange}
      filterLabel="通知タイプ"
      filterOptions={filterOptions}
      onRefresh={handleRefresh}
      refreshDisabled={loading}
    />
  );

  return (
    <PageContainer>
      <PageHeader
        title="通知一覧"
        actions={headerActions}
      />

      <TabContainer
        tabs={tabs}
        value={tabValue}
        onChange={handleTabChange}
        headerActions={tabHeaderActions}
        data-testid="notifications-tabs"
      >
        {loading ? (
          <SectionLoader message="通知を読み込み中..." size="large" padding={5} />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            type="notifications"
            message={tabValue === 'unread' ? '未読の通知はありません' : '通知はありません'}
            description={tabValue === 'unread' ? 'すべての通知を確認済みです' : '新しい通知が届くとここに表示されます'}
          />
        ) : (
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {filteredNotifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                variant="detailed"
                showIcon={false}
                showTypeChip={true}
                href={getNotificationLink(notification)}
                onClick={handleNotificationClick}
                formatDate={formatDate}
                index={index}
                totalItems={filteredNotifications.length}
              />
            ))}
          </List>
        )}
        
        {/* CommonPaginationコンポーネントを使用 */}
        <CommonPagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          loading={loading}
          showTotalCount={true}
          data-testid="notifications-pagination"
          sx={{ px: 2 }}
        />
      </TabContainer>
    </PageContainer>
  );
} 