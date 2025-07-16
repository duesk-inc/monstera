import React from 'react';
import { TableRow, TableCell } from '@mui/material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { LeaveRequest, LeaveRequestDetail } from '@/types/leave';
import { safeFormatDate } from '@/utils/dateUtils';
import { StatusChip } from '@/components/common';

// 表スタイルを定義
const styles = {
  alternateRow: {
    '&:last-child td, &:last-child th': { border: 0 },
  },
  alternateRowHighlight: {
    '&:last-child td, &:last-child th': { border: 0 },
    bgcolor: 'rgba(0, 0, 0, 0.02)'
  }
};

interface LeaveRequestRowProps {
  request: LeaveRequest;
  detail?: LeaveRequestDetail;
  index?: number;
}

export const LeaveRequestRow: React.FC<LeaveRequestRowProps> = ({ 
  request, 
  detail, 
  index
}) => {
  // ステータスをApplicationStatus型にマッピング
  const getApplicationStatus = (status: string) => {
    switch (status) {
      case 'approved':
        return 'approved' as const;
      case 'pending':
        return 'pending' as const;
      case 'rejected':
        return 'rejected' as const;
      default:
        return 'pending' as const;
    }
  };

  const applicationStatus = getApplicationStatus(request.status);
  
  // 詳細がない場合
  if (!detail) {
    return (
      <TableRow sx={styles.alternateRow}>
        <TableCell component="th" scope="row">
          {safeFormatDate(request.requestDate)}
        </TableCell>
        <TableCell>{request.leaveTypeName}</TableCell>
        <TableCell>-</TableCell>
        <TableCell>
          <StatusChip status={applicationStatus} />
        </TableCell>
        <TableCell>
          {request.processedAt ? safeFormatDate(request.processedAt) : '—'}
        </TableCell>
      </TableRow>
    );
  }
  
  // 詳細がある場合（日付ごとの行）
  const leaveDateObj = new Date(detail.leaveDate);
  
  // 無効な日付をチェック
  if (isNaN(leaveDateObj.getTime())) {
    console.warn('Invalid leave date:', detail.leaveDate);
    return (
      <TableRow
        sx={index && index % 2 === 1 ? styles.alternateRowHighlight : styles.alternateRow}
      >
        <TableCell component="th" scope="row">
          {safeFormatDate(request.requestDate)}
        </TableCell>
        <TableCell>{request.leaveTypeName}</TableCell>
        <TableCell>無効な日付</TableCell>
        <TableCell>
          <StatusChip status={applicationStatus} />
        </TableCell>
        <TableCell>
          {request.processedAt ? safeFormatDate(request.processedAt) : '—'}
        </TableCell>
      </TableRow>
    );
  }
  
  const formattedLeaveDate = format(
    leaveDateObj,
    'yyyy年M月d日(EEE)',
    { locale: ja }
  );
  
  // 時間指定がある場合は時間も表示
  let displayDate = formattedLeaveDate;
  if (request.isHourlyBased && detail.startTime && detail.endTime) {
    displayDate += ` ${detail.startTime}～${detail.endTime}`;
  }
  
  return (
    <TableRow
      sx={index && index % 2 === 1 ? styles.alternateRowHighlight : styles.alternateRow}
    >
      <TableCell component="th" scope="row">
        {safeFormatDate(request.requestDate)}
      </TableCell>
      <TableCell>{request.leaveTypeName}</TableCell>
      <TableCell>{displayDate}</TableCell>
      <TableCell>
        <StatusChip status={applicationStatus} />
      </TableCell>
      <TableCell>
        {request.processedAt ? safeFormatDate(request.processedAt) : '—'}
      </TableCell>
    </TableRow>
  );
}; 