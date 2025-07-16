import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Button,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNotifications, getNotificationTypeLabel, getNotificationSeverityColor } from '@/hooks/common/useNotifications';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const {
    notifications,
    unreadCount,
    hasUnread,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      // 通知を既読にする
      await markAsRead(notification.id);

      // 関連ページへの遷移
      if (notification.related_id) {
        switch (notification.type) {
          case 'weekly_report_reminder':
            router.push(`/weekly-reports/${notification.related_id}`);
            break;
          case 'alert':
            router.push('/admin/weekly-reports?tab=alerts');
            break;
          default:
            break;
        }
      }

      handleClose();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'warning':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'info':
      default:
        return <InfoIcon fontSize="small" color="info" />;
    }
  };

  const getTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ja,
    });
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label={`${unreadCount}件の未読通知`}
      >
        <Badge badgeContent={unreadCount} color="error">
          {hasUnread ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box px={2} py={1.5}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">通知</Typography>
            {hasUnread && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllAsRead}
                startIcon={isMarkingAllAsRead ? <CircularProgress size={16} /> : <CheckCircleIcon />}
              >
                すべて既読にする
              </Button>
            )}
          </Box>
        </Box>

        <Divider />

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Box py={4} textAlign="center">
            <Typography color="textSecondary">新しい通知はありません</Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                disabled={isMarkingAsRead}
                sx={{
                  py: 1.5,
                  px: 2,
                  backgroundColor: notification.read_at ? 'transparent' : 'action.hover',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
              >
                <ListItemIcon>{getSeverityIcon(notification.severity)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={notification.read_at ? 400 : 600}>
                        {notification.title}
                      </Typography>
                      <Chip
                        label={getNotificationTypeLabel(notification.type)}
                        size="small"
                        variant="outlined"
                        color={getNotificationSeverityColor(notification.severity) as any}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="textSecondary" component="span">
                        {notification.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        component="span"
                        display="block"
                        mt={0.5}
                      >
                        {getTimeAgo(notification.created_at)}
                      </Typography>
                    </>
                  }
                />
              </MenuItem>
            ))}
          </Box>
        )}

        <Divider />

        <Box px={2} py={1}>
          <Button
            fullWidth
            size="small"
            onClick={() => {
              router.push('/notifications');
              handleClose();
            }}
          >
            すべての通知を見る
          </Button>
        </Box>
      </Menu>
    </>
  );
};