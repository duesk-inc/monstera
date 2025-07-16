'use client';

import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/common/Toast';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'hidden';
  created_at: string;
  read_at?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'weekly_report_reminder':
      return <ScheduleIcon />;
    case 'weekly_report_submitted':
      return <CheckCircleIcon color="success" />;
    case 'weekly_report_overdue':
    case 'weekly_report_escalation':
      return <WarningIcon color="warning" />;
    case 'bulk_reminder_complete':
      return <EmailIcon color="primary" />;
    case 'bulk_reminder_failed':
      return <ErrorIcon color="error" />;
    default:
      return <InfoIcon />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'primary';
    case 'low':
      return 'default';
    default:
      return 'default';
  }
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  open,
  onClose,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();

  // 通知一覧を取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', tabValue === 0 ? 'unread' : 'all'],
    queryFn: async () => {
      const params = tabValue === 0 ? { status: 'unread' } : {};
      const response = await apiClient.get('/api/v1/notifications', { params });
      return response.data.notifications || [];
    },
    enabled: open,
  });

  // 既読にする
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      await apiClient.put('/api/v1/notifications/read', {
        notification_ids: notificationIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSuccess('通知を既読にしました');
    },
  });

  // 全て既読にする
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put('/api/v1/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSuccess('全ての通知を既読にしました');
    },
  });

  const handleMarkAsRead = (notification: Notification) => {
    if (notification.status === 'unread') {
      markAsReadMutation.mutate([notification.id]);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const notifications = data || [];
  const unreadCount = notifications.filter((n: Notification) => n.status === 'unread').length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            通知
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount}件の未読`}
              size="small"
              color="primary"
              sx={{ mr: 2 }}
            />
          )}
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ mb: 2 }}
          variant="fullWidth"
        >
          <Tab label="未読" />
          <Tab label="すべて" />
        </Tabs>

        {tabValue === 0 && unreadCount > 0 && (
          <Box sx={{ mb: 2, textAlign: 'right' }}>
            <Button
              size="small"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              すべて既読にする
            </Button>
          </Box>
        )}
      </Box>

      <Divider />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">通知の取得に失敗しました</Alert>
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {tabValue === 0 ? '未読の通知はありません' : '通知はありません'}
          </Typography>
        </Box>
      ) : (
        <List sx={{ pt: 0 }}>
          {notifications.map((notification: Notification) => (
            <React.Fragment key={notification.id}>
              <ListItem
                button
                onClick={() => handleMarkAsRead(notification)}
                sx={{
                  opacity: notification.status === 'read' ? 0.6 : 1,
                  bgcolor: notification.status === 'unread' ? 'action.hover' : 'transparent',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.notification_type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {notification.title}
                      </Typography>
                      <Chip
                        label={notification.priority}
                        size="small"
                        color={getPriorityColor(notification.priority) as any}
                        sx={{ height: 20 }}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, mb: 1 }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(notification.created_at), 'M月d日 HH:mm', {
                          locale: ja,
                        })}
                        {notification.read_at && ' • 既読済み'}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
    </Drawer>
  );
};