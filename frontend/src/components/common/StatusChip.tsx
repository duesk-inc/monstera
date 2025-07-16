import React from 'react';
import { Chip, ChipProps } from '@mui/material';

// 申請ステータスの型定義
export type ApplicationStatus = 'approved' | 'pending' | 'rejected' | 'submitted' | 'draft' | 'not_submitted';

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
};

// ステータス色の統一定義
const STATUS_COLORS: Record<ApplicationStatus, ChipProps['color']> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'error', 
  submitted: 'success',
  draft: 'warning',
  not_submitted: 'default',
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

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      {...props}
      sx={{
        fontWeight: 'medium',
        borderRadius: 1,
        ...props.sx,
      }}
    />
  );
};

export default StatusChip; 