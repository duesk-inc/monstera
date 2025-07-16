import React from 'react';
import { format } from 'date-fns';
import {
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { DailyRecord } from '@/types/weeklyReport';
import { calculateWorkHours } from '@/utils/dateUtils';

interface DailyRecordHeaderProps {
  date: Date;
  dayOfWeek: string;
  isWeekend: boolean;
  record: DailyRecord;
  recordIndex: number;
  isExpanded: boolean;
  isSubmitted: boolean;
  onToggleExpand: () => void;
}

/**
 * 日別記録ヘッダーコンポーネント
 * 日付表示、曜日、ステータスチップ、作業時間サマリーを管理
 */
export const DailyRecordHeader: React.FC<DailyRecordHeaderProps> = ({
  date,
  dayOfWeek,
  isWeekend,
  record,
  recordIndex,
  isExpanded,
  isSubmitted,
  onToggleExpand,
}) => {
  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mr: 1 }}>
          {format(date, 'M月d日')} ({dayOfWeek})
        </Typography>
        {dayOfWeek === '日' && (
          <Chip size="small" label="休日" color="error" sx={{ mr: 1 }} />
        )}
        {dayOfWeek === '土' && (
          <Chip size="small" label="休日" color="primary" />
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {(!isWeekend || (isWeekend && record.isHolidayWork)) && recordIndex !== -1 && (
          <Typography variant="body2" color="text.secondary" component="div">
            {record.hasClientWork ? (
              <>
                {/* 自社勤怠と客先勤怠のコンテナ - デスクトップでは横並び、モバイルでは縦並び */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 3 },
                  mb: { xs: 0, sm: 0 }
                }} component="span">
                  {/* 自社勤怠 */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    mb: { xs: 0.5, sm: 0 },
                    flexWrap: 'nowrap'
                  }} component="span">
                    <Typography component="span" variant="body2" fontWeight="medium" sx={{ minWidth: 80 }}>
                      自社勤怠:
                    </Typography>
                    <Typography component="span" variant="body2">
                      {record.startTime || '-'} 〜 {record.endTime || '-'}
                    </Typography>
                    <Typography component="span" variant="body2" sx={{ ml: 2 }}>
                      休憩: {record.breakTime !== undefined ? record.breakTime.toFixed(2) : '0.00'} 時間
                    </Typography>
                    <Typography component="span" variant="body2" sx={{ ml: 2, fontWeight: 'bold', color: 'text.primary' }}>
                      {calculateWorkHours(record.startTime || '', record.endTime || '', record.breakTime || 0).toFixed(2)} 時間
                    </Typography>
                  </Box>
                  
                  {/* 客先勤怠 */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    flexWrap: 'nowrap'
                  }} component="span">
                    <Typography component="span" variant="body2" fontWeight="medium" sx={{ minWidth: 80, color: 'secondary.main' }}>
                      客先勤怠:
                    </Typography>
                    <Typography component="span" variant="body2" color="secondary.main">
                      {record.clientStartTime || '-'} 〜 {record.clientEndTime || '-'}
                    </Typography>
                    <Typography component="span" variant="body2" color="secondary.main" sx={{ ml: 2 }}>
                      休憩: {record.clientBreakTime !== undefined ? record.clientBreakTime.toFixed(2) : '0.00'} 時間
                    </Typography>
                    <Typography component="span" variant="body2" sx={{ ml: 2, fontWeight: 'bold', color: 'secondary.main' }}>
                      {calculateWorkHours(record.clientStartTime || '', record.clientEndTime || '', record.clientBreakTime || 0).toFixed(2)} 時間
                    </Typography>
                  </Box>
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center' }} component="span">
                <Typography component="span" variant="body2" fontWeight="medium" sx={{ width: 80 }}>
                  自社勤怠:
                </Typography>
                <Typography component="span" variant="body2">
                  {record.startTime || '-'} 〜 {record.endTime || '-'}
                </Typography>
                <Typography component="span" variant="body2" sx={{ ml: 2 }}>
                  休憩: {record.breakTime !== undefined ? record.breakTime.toFixed(2) : '0.00'} 時間
                </Typography>
                <Typography component="span" variant="body2" sx={{ ml: 2, fontWeight: 'bold', color: 'text.primary' }}>
                  {calculateWorkHours(record.startTime || '', record.endTime || '', record.breakTime || 0).toFixed(2)} 時間
                </Typography>
              </Box>
            )}
          </Typography>
        )}
        <IconButton 
          aria-label={isExpanded ? '閉じる' : '開く'}
          disabled={isSubmitted}
          size="small"
          onClick={onToggleExpand}
        >
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
    </Box>
  );
}; 