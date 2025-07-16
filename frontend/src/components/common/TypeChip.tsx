import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import {
  CalendarToday as CalendarTodayIcon,
  Receipt as ReceiptIcon, 
  Assignment as AssignmentIcon,
  Business as BusinessIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

// 通知タイプの型定義
export type NotificationType = 'leave' | 'expense' | 'weekly' | 'project' | 'system';

interface TypeChipProps extends Omit<ChipProps, 'label' | 'color'> {
  type: NotificationType;
  showIcon?: boolean;
}

// タイプラベルの統一定義
const TYPE_LABELS: Record<NotificationType, string> = {
  leave: '休暇',
  expense: '経費',
  weekly: '週報',
  project: 'プロジェクト',
  system: 'システム',
};

// タイプ色の統一定義
const TYPE_COLORS: Record<NotificationType, ChipProps['color']> = {
  leave: 'primary',
  expense: 'warning',
  weekly: 'info', 
  project: 'success',
  system: 'secondary',
};

// タイプアイコンの統一定義
const TYPE_ICONS: Record<NotificationType, React.ReactElement> = {
  leave: <CalendarTodayIcon fontSize="small" />,
  expense: <ReceiptIcon fontSize="small" />,
  weekly: <AssignmentIcon fontSize="small" />,
  project: <BusinessIcon fontSize="small" />,
  system: <NotificationsIcon fontSize="small" />,
};

/**
 * 統一された通知タイプチップコンポーネント
 * 
 * @param type - 通知タイプ
 * @param showIcon - アイコン表示フラグ
 * @param props - その他のChipProps
 */
export const TypeChip: React.FC<TypeChipProps> = ({
  type,
  showIcon = false,
  size = 'small',
  variant = 'outlined',
  ...props
}) => {
  const label = TYPE_LABELS[type];
  const color = TYPE_COLORS[type];
  const icon = showIcon ? TYPE_ICONS[type] : undefined;

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      variant={variant}
      icon={icon}
      {...props}
      sx={{
        borderRadius: 1,
        ...props.sx,
      }}
    />
  );
};

export default TypeChip; 