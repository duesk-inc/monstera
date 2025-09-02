import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Description as DescriptionIcon,
  Undo as UndoIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';

// 申請ステータスの型定義
export type ApplicationStatus = 'approved' | 'pending' | 'rejected' | 'submitted' | 'draft' | 'not_submitted' | 'returned';

interface StatusChipProps extends Omit<ChipProps, 'label' | 'color'> {
  status: ApplicationStatus;
  label?: string; // カスタムラベルを許可
}

// ステータスラベルの統一定義
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  approved: '承認済',
  pending: '申請中', 
  rejected: '却下',
  submitted: '提出済',
  draft: '下書き',
  not_submitted: '未提出',
  returned: '差し戻し',
};

// ステータス色の統一定義
const STATUS_COLORS: Record<ApplicationStatus, ChipProps['color']> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'error', 
  submitted: 'info',
  draft: 'info',
  not_submitted: 'default',
  returned: 'warning',
};

// ステータスアイコンの定義
const STATUS_ICONS: Record<ApplicationStatus, React.ReactElement | null> = {
  approved: <CheckCircleIcon fontSize="small" />,
  pending: <ScheduleIcon fontSize="small" />,
  rejected: <CancelIcon fontSize="small" />,
  submitted: <SendIcon fontSize="small" />,
  draft: <EditIcon fontSize="small" />,
  not_submitted: <HourglassEmptyIcon fontSize="small" />,
  returned: <UndoIcon fontSize="small" />,
};

/**
 * 統一された申請ステータスチップコンポーネント
 * 
 * @param status - 申請ステータス
 * @param props - その他のChipProps
 */
export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label: customLabel,
  size = 'small',
  ...props
}) => {
  const label = customLabel || STATUS_LABELS[status];
  const color = STATUS_COLORS[status];
  const icon = STATUS_ICONS[status];

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      icon={icon || undefined}
      {...props}
      sx={{
        fontWeight: 'medium',
        borderRadius: 1,
        // draftステータスの場合、より目立つスタイルを適用
        ...(status === 'draft' && {
          backgroundColor: 'info.light',
          color: 'info.dark',
          '& .MuiChip-icon': {
            color: 'info.dark',
          },
        }),
        ...props.sx,
      }}
    />
  );
};

export default StatusChip; 
