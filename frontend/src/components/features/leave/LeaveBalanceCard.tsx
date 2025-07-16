import React from 'react';
import { Typography } from '@mui/material';
import { StatusCard } from '@/components/common/cards';
import { LeaveBalance } from '@/types/leave';

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
  today: Date;
}

export const LeaveBalanceCard: React.FC<LeaveBalanceCardProps> = ({ balance, today }) => {
  // 有効なデータがない場合は表示しない
  if (balance.total === 0 && balance.remaining === 0) return null;
  
  // 期限切れかどうかの判定
  const isExpired = balance.expireDate 
    ? new Date(balance.expireDate) < today 
    : false;

  // カードの背景色とスタイルを決定
  const getCardStyles = () => {
    if (isExpired) {
      return {
        bgcolor: 'rgba(0, 0, 0, 0.05)',
        opacity: 0.7,
      };
    }
    if (balance.remaining === 0) {
      return {
        bgcolor: 'rgba(0, 0, 0, 0.05)',
      };
    }
    return {
      bgcolor: '#ffffff',
    };
  };

  return (
    <StatusCard
      title={balance.name}
      value={balance.remaining.toFixed(1)}
      unit="日"
      sx={{
        minWidth: 200,
        flexGrow: 1,
        ...getCardStyles(),
      }}
      data-testid="leave-balance-card"
    >
      {/* 使用状況の詳細 */}
      <Typography variant="body2" color="text.secondary" mb={1}>
        （使用: {balance.used.toFixed(1)} / 合計: {balance.total.toFixed(1)}）
      </Typography>

      {/* 有効期限の表示 */}
      {balance.expireDate && (
        <Typography 
          variant="caption" 
          color={isExpired ? "error" : "text.secondary"}
          sx={{ display: 'block' }}
        >
          {isExpired 
            ? `${balance.expireDate}に期限切れ` 
            : `有効期限: ${balance.expireDate}`}
        </Typography>
      )}
    </StatusCard>
  );
}; 