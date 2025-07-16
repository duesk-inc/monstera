import React from 'react';
import {
  Box,
  Typography,
  TextField,
} from '@mui/material';
import {
  Comment as CommentIcon,
} from '@mui/icons-material';
import { DailyRecord } from '@/types/weeklyReport';

interface RemarksInputProps {
  record: DailyRecord;
  isWeekend: boolean;
  isSubmitted: boolean;
  onRemarksChange: (value: string) => void;
}

/**
 * 備考入力コンポーネント
 * 日別記録の備考欄を管理
 */
export const RemarksInput: React.FC<RemarksInputProps> = ({
  record,
  isWeekend,
  isSubmitted,
  onRemarksChange,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '120px' }}>
        <CommentIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
        <Typography variant="subtitle2">備考</Typography>
      </Box>
      
      <Box sx={{ flex: 1 }}>
        <TextField
          placeholder="備考があれば入力してください"
          value={record.remarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          size="small" 
          fullWidth
          multiline
          rows={2}
          disabled={isWeekend && !record.isHolidayWork || isSubmitted}
        />
      </Box>
    </Box>
  );
}; 