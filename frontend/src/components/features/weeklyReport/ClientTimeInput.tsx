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

interface ClientTimeInputProps {
  record: DailyRecord;
  isWeekend: boolean;
  isSubmitted: boolean;
  onClientTimeChange: (field: 'clientStartTime' | 'clientEndTime', time: Date | null) => void;
  onClientBreakTimeChange: (value: string) => void;
}

/**
 * 客先勤怠時間入力コンポーネント
 * 客先の出勤時間、退勤時間、休憩時間の入力を管理
 */
export const ClientTimeInput: React.FC<ClientTimeInputProps> = ({
  record,
  isWeekend,
  isSubmitted,
  onClientTimeChange,
  onClientBreakTimeChange,
}) => {
  if (!record.hasClientWork) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '120px' }}>
        <TimeIcon fontSize="small" sx={{ mr: 1, color: 'secondary.main' }} />
        <Typography variant="subtitle2" color="secondary.main">客先勤怠</Typography>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flex: 1 }}>
        <Box sx={{ flex: 1 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <TimePicker
              label="客先出勤時間"
              value={record.clientStartTime ? new Date(`2023-01-01T${record.clientStartTime}:00`) : null}
              onChange={(newTime) => onClientTimeChange('clientStartTime', newTime)}
              disabled={isWeekend && !record.isHolidayWork || isSubmitted}
              slotProps={{ 
                textField: { 
                  size: 'small',
                  fullWidth: true,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <TimeIcon fontSize="small" color="secondary" />
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
              label="客先退勤時間"
              value={record.clientEndTime ? new Date(`2023-01-01T${record.clientEndTime}:00`) : null}
              onChange={(newTime) => onClientTimeChange('clientEndTime', newTime)}
              disabled={isWeekend && !record.isHolidayWork || isSubmitted}
              slotProps={{ 
                textField: { 
                  size: 'small',
                  fullWidth: true,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <TimeIcon fontSize="small" color="secondary" />
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
            label="客先休憩時間"
            value={record.clientBreakTime !== undefined ? record.clientBreakTime.toFixed(2) : '0.00'}
            onChange={(e) => onClientBreakTimeChange(e.target.value)}
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
                  <TimeIcon fontSize="small" color="secondary" />
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