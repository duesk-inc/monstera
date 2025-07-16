import React from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { DailyRecord } from '@/types/weeklyReport';

interface CompanyTimeInputProps {
  record: DailyRecord;
  isWeekend: boolean;
  isSubmitted: boolean;
  onTimeChange: (field: 'startTime' | 'endTime', time: Date | null) => void;
  onBreakTimeChange: (value: string) => void;
}

/**
 * 自社勤怠時間入力コンポーネント
 * 出勤時間、退勤時間、休憩時間の入力を管理
 */
export const CompanyTimeInput: React.FC<CompanyTimeInputProps> = ({
  record,
  isWeekend,
  isSubmitted,
  onTimeChange,
  onBreakTimeChange,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '120px' }}>
        <TimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
        <Typography variant="subtitle2">自社勤怠</Typography>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flex: 1 }}>
        <Box sx={{ flex: 1 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <TimePicker
              label="出勤時間"
              value={record.startTime ? new Date(`2023-01-01T${record.startTime}:00`) : null}
              onChange={(newTime) => onTimeChange('startTime', newTime)}
              disabled={isWeekend && !record.isHolidayWork || isSubmitted}
              slotProps={{ 
                textField: { 
                  size: 'small',
                  fullWidth: true,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <TimeIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }
                } 
              }}
            />
          </LocalizationProvider>
        </Box>
        <Box sx={{ flex: 1 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <TimePicker
              label="退勤時間"
              value={record.endTime ? new Date(`2023-01-01T${record.endTime}:00`) : null}
              onChange={(newTime) => onTimeChange('endTime', newTime)}
              disabled={isWeekend && !record.isHolidayWork || isSubmitted}
              slotProps={{ 
                textField: { 
                  size: 'small',
                  fullWidth: true,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <TimeIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }
                } 
              }}
            />
          </LocalizationProvider>
        </Box>
        <Box sx={{ flex: 1 }}>
          <TextField
            label="休憩時間"
            value={record.breakTime !== undefined ? record.breakTime.toFixed(2) : '0.00'}
            onChange={(e) => onBreakTimeChange(e.target.value)}
            size="small"
            fullWidth
            type="number"
            inputProps={{ 
              min: 0, 
              max: 10, 
              step: 0.1 
            }}
            disabled={isWeekend && !record.isHolidayWork || isSubmitted}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TimeIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: <InputAdornment position="end">時間</InputAdornment>,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}; 