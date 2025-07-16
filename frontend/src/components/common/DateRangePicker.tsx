import React from 'react';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  SxProps,
  Theme,
} from '@mui/material';
import {
  DatePicker,
  LocalizationProvider,
} from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { SwapHoriz as SwapIcon } from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

interface DateRangePickerProps {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  onStartDateChange: (date: Dayjs | null) => void;
  onEndDateChange: (date: Dayjs | null) => void;
  startLabel?: string;
  endLabel?: string;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  sx?: SxProps<Theme>;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = '開始日',
  endLabel = '終了日',
  minDate,
  maxDate,
  disabled = false,
  error = false,
  helperText,
  sx,
}) => {
  const handleSwapDates = () => {
    if (startDate && endDate) {
      const temp = startDate;
      onStartDateChange(endDate);
      onEndDateChange(temp);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Box sx={{ ...sx }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DatePicker
            label={startLabel}
            value={startDate}
            onChange={onStartDateChange}
            minDate={minDate}
            maxDate={endDate || maxDate}
            disabled={disabled}
            slotProps={{
              textField: {
                size: 'small',
                error,
                fullWidth: true,
              },
            }}
          />
          <IconButton
            onClick={handleSwapDates}
            disabled={disabled || !startDate || !endDate}
            size="small"
          >
            <SwapIcon />
          </IconButton>
          <DatePicker
            label={endLabel}
            value={endDate}
            onChange={onEndDateChange}
            minDate={startDate || minDate}
            maxDate={maxDate}
            disabled={disabled}
            slotProps={{
              textField: {
                size: 'small',
                error,
                fullWidth: true,
              },
            }}
          />
        </Box>
        {helperText && (
          <Typography
            variant="caption"
            color={error ? 'error' : 'text.secondary'}
            sx={{ mt: 0.5, display: 'block' }}
          >
            {helperText}
          </Typography>
        )}
      </Box>
    </LocalizationProvider>
  );
};