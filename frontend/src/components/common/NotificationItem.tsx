import React from 'react';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import Link from 'next/link';
import { UserNotification } from '@/types/notification';
import { TypeChip, NotificationBadge } from '@/components/common';
import { getNotificationIcon, getNotificationTypeColor } from '@/utils/notificationUtils';

export type NotificationItemVariant = 'compact' | 'detailed';

interface NotificationItemProps {
  /** 通知データ */
  notification: UserNotification;
  /** 表示バリアント */
  variant?: NotificationItemVariant;
  /** アイコン表示フラグ */
  showIcon?: boolean;
  /** TypeChip表示フラグ */
  showTypeChip?: boolean;
  /** クリック時のカスタム処理 */
  onClick?: (notification: UserNotification, event: React.MouseEvent) => void;
  /** リンク先URL */
  href?: string;
  /** 日付フォーマット関数 */
  formatDate?: (date: string, short?: boolean) => string;
  /** 区切り線表示フラグ */
  showDivider?: boolean;
  /** インデックス（区切り線制御用） */
  index?: number;
  /** 総アイテム数（区切り線制御用） */
  totalItems?: number;
}

/**
 * 統一された通知行コンポーネント
 * ダッシュボード（compact）と通知一覧（detailed）の両方に対応
 */
export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  variant = 'detailed',
  showIcon = true,
  showTypeChip = true,
  onClick,
  href,
  formatDate,
  showDivider = true,
  index = 0,
  totalItems = 1,
}) => {
  // バリアント別のスタイル設定
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          py: 2,
          px: 2,
        };
      case 'detailed':
      default:
        return {
          py: 2.5,
          px: 3,
        };
    }
  };

  // クリック処理
  const handleClick = (event: React.MouseEvent) => {
    if (onClick) {
      onClick(notification, event);
    }
  };

  // 共通のListItemスタイル
  const listItemStyles = {
    ...getVariantStyles(),
    cursor: 'pointer',
    bgcolor: notification.isRead ? 'transparent' : 'action.hover',
    borderLeft: notification.isRead ? 'none' : '4px solid',
    borderLeftColor: 'primary.main',
    '&:hover': { bgcolor: 'action.hover' },
    alignItems: 'flex-start',
  };

  // コンテンツの構築
  const renderContent = () => {
    if (variant === 'compact') {
      // ダッシュボード向けコンパクト表示
      return (
        <>
          {showIcon && (
            <ListItemIcon sx={{ 
              color: getNotificationTypeColor(notification.notification.notificationType),
              minWidth: '42px',
              mt: 0
            }}>
              {getNotificationIcon(notification.notification.notificationType)}
            </ListItemIcon>
          )}
          <ListItemText
            primary={
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography
                  variant="body1"
                  fontWeight={notification.isRead ? 'normal' : 'bold'}
                >
                  {notification.notification.title}
                </Typography>
                {formatDate && (
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(notification.notification.createdAt, true)}
                  </Typography>
                )}
              </Box>
            }
            secondary={
              <Typography
                sx={{ display: 'inline', opacity: notification.isRead ? 0.8 : 1 }}
                component="span"
                variant="body2"
                color="text.primary"
              >
                {notification.notification.message}
              </Typography>
            }
            primaryTypographyProps={{ color: notification.isRead ? 'text.primary' : 'primary' }}
          />
          {!notification.isRead && (
            <NotificationBadge 
              variant="dot" 
              position="inline" 
              showDot={true}
              sx={{ ml: 1 }}
            />
          )}
        </>
      );
    } else {
      // 通知一覧向け詳細表示
      return (
        <ListItemText
          primary={
            <Box display="flex" alignItems="center">
              {showTypeChip && (
                <TypeChip 
                  type={notification.notification.notificationType}
                  size="small"
                  sx={{ mr: 2 }}
                />
              )}
              <Typography
                variant="body1"
                fontWeight={notification.isRead ? 'normal' : 'bold'}
              >
                {notification.notification.title}
              </Typography>
            </Box>
          }
          secondary={
            <>
              <Typography
                sx={{ display: 'block', opacity: notification.isRead ? 0.8 : 1, my: 1 }}
                component="span"
                variant="body2"
                color="text.primary"
              >
                {notification.notification.message}
              </Typography>
              {formatDate && (
                <Typography variant="caption" color="text.secondary">
                  {formatDate(notification.notification.createdAt)}
                </Typography>
              )}
            </>
          }
          primaryTypographyProps={{ color: notification.isRead ? 'text.primary' : 'primary' }}
        />
      );
    }
  };

  // リンクありの場合
  if (href) {
    return (
      <React.Fragment>
        <ListItem
          component={Link}
          href={href}
          sx={listItemStyles}
          onClick={handleClick}
        >
          {renderContent()}
        </ListItem>
        {showDivider && index < totalItems - 1 && (
          <Divider variant={variant === 'compact' ? 'inset' : undefined} component="li" />
        )}
      </React.Fragment>
    );
  }

  // 通常のクリック処理の場合
  return (
    <React.Fragment>
      <ListItem
        sx={listItemStyles}
        onClick={handleClick}
      >
        {renderContent()}
      </ListItem>
      {showDivider && index < totalItems - 1 && (
        <Divider variant={variant === 'compact' ? 'inset' : undefined} component="li" />
      )}
    </React.Fragment>
  );
};

export default NotificationItem; 