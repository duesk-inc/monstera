'use client';

import React from 'react';
import { IconButton, Badge, Tooltip } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface NotificationBadgeProps {
  onClick: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  onClick,
  size = 'medium',
}) => {
  // 未読通知数を取得
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/notifications/unread-count');
      return response.data.count || 0;
    },
    refetchInterval: 30000, // 30秒ごとに更新
  });

  const iconSize = size === 'small' ? 20 : size === 'large' ? 28 : 24;

  return (
    <Tooltip title="通知">
      <IconButton
        onClick={onClick}
        sx={{
          color: 'text.secondary',
          mx: 1,
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.75rem',
              height: 20,
              minWidth: 20,
              right: -3,
              top: 3,
            },
          }}
        >
          <NotificationsIcon sx={{ fontSize: iconSize }} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};