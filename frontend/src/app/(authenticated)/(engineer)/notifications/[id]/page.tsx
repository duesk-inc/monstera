'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, notFound } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink,
  Alert,
  Backdrop,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Schedule as ScheduleIcon,
  Category as CategoryIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import ActionButton from '@/components/common/ActionButton';
import { 
  PageContainer, 
  PageHeader, 
  ContentCard,
  DetailInfoGrid,
} from '@/components/common/layout';
import { getUserNotifications, markNotificationsAsRead } from '@/lib/api/notification';
import { UserNotification } from '@/types/notification';

// ローディング用コンポーネント
function NotificationDetailLoading() {
  return (
    <PageContainer>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    </PageContainer>
  );
}

// NotificationDetailContentコンポーネントを分離
function NotificationDetailContent() {
  const params = useParams();
  const notificationId = (params as any)?.id as string | undefined;
  
  // 状態管理
  const [notification, setNotification] = useState<UserNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 通知データの取得
  useEffect(() => {
    const fetchNotification = async () => {
      if (!notificationId) {
        // IDがない＝不正URL。404へ直送
        notFound();
        return;
      }

      try {
        setIsLoading(true);
        const notificationList = await getUserNotifications();
        const foundNotification = notificationList.notifications.find(n => n.id === notificationId);
        if (!foundNotification) {
          // 404扱い
          notFound();
          return;
        } else {
          setNotification(foundNotification);
          // 通知を既読にマーク
          await markNotificationsAsRead([foundNotification.id]);
        }
      } catch (err) {
        console.error('通知データの取得に失敗しました:', err);
        setError('通知データの取得中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotification();
  }, [notificationId]);

  // ローディング表示
  if (isLoading) {
    return (
      <PageContainer>
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  // エラー表示
  if (error) {
    return (
      <PageContainer>
        <ContentCard>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <ActionButton
            component={Link}
            href="/notifications"
            buttonType="ghost"
            startIcon={<ArrowBackIcon />}
          >
            通知一覧に戻る
          </ActionButton>
        </ContentCard>
      </PageContainer>
    );
  }

  // 通知が見つからない場合
  if (!notification) {
    return (
      <PageContainer>
        <ContentCard>
          <Alert severity="warning" sx={{ mb: 2 }}>
            通知情報が見つかりませんでした
          </Alert>
          <ActionButton
            component={Link}
            href="/notifications"
            buttonType="ghost"
            startIcon={<ArrowBackIcon />}
          >
            通知一覧に戻る
          </ActionButton>
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>

      {/* パンくずナビゲーション */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <MuiLink component={Link} href="/" color="inherit">
          ホーム
        </MuiLink>
        <MuiLink component={Link} href="/notifications" color="inherit">
          通知一覧
        </MuiLink>
        <Typography color="text.primary">通知詳細</Typography>
      </Breadcrumbs>

      <PageHeader
        title={notification.notification.title}
        subtitle={`${notification.notification.notificationType} | ${format(new Date(notification.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}`}
        breadcrumbs={
          <Breadcrumbs aria-label="breadcrumb">
            <MuiLink component={Link} href="/" color="inherit">
              ホーム
            </MuiLink>
            <MuiLink component={Link} href="/notifications" color="inherit">
              通知一覧
            </MuiLink>
            <Typography color="text.primary">通知詳細</Typography>
          </Breadcrumbs>
        }
        actions={
          <ActionButton
            component={Link}
            href="/notifications"
            buttonType="ghost"
            startIcon={<ArrowBackIcon />}
          >
            一覧に戻る
          </ActionButton>
        }
      />

      <ContentCard variant="elevated">
        {/* 通知タイプチップ */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={notification.notification.notificationType}
            color="primary"
            size="small"
          />
        </Box>

        {/* 通知詳細情報 */}
        <DetailInfoGrid
          items={[
            {
              label: "通知タイプ",
              value: notification.notification.notificationType,
              icon: <CategoryIcon fontSize="small" />,
              gridSize: { xs: 12, md: 6 }
            },
            {
              label: "受信日時",
              value: format(new Date(notification.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja }),
              icon: <ScheduleIcon fontSize="small" />,
              gridSize: { xs: 12, md: 6 }
            },
            {
              label: "既読状態",
              value: notification.isRead ? '既読' : '未読',
              valueColor: notification.isRead ? 'text.secondary' : 'primary.main',
              valueFontWeight: notification.isRead ? 'normal' : 'bold',
              gridSize: { xs: 12, md: 6 }
            },
            {
              label: "通知内容",
              value: (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {notification.notification.message}
                </Typography>
              ),
              icon: <InfoIcon fontSize="small" />,
              gridSize: { xs: 12 }
            },
          ]}
          spacing={3}
        />

        <Divider sx={{ my: 4 }} />

        {/* アクションボタン */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <ActionButton
            component={Link}
            href="/notifications"
            buttonType="secondary"
            startIcon={<ArrowBackIcon />}
          >
            通知一覧に戻る
          </ActionButton>
        </Box>
      </ContentCard>
    </PageContainer>
  );
}

export default function NotificationDetailPage() {
  return (
    <Suspense fallback={<NotificationDetailLoading />}>
      <NotificationDetailContent />
    </Suspense>
  );
}
