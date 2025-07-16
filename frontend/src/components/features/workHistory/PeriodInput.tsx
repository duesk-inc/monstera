import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormLabel,
  FormHelperText,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { styled } from '@mui/material/styles';
import { differenceInMonths, format, isValid, isBefore, isAfter } from 'date-fns';

const PeriodContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const DateFieldsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

const DurationChip = styled(Chip)(({ theme }) => ({
  marginTop: theme.spacing(1),
  fontWeight: 500,
}));

interface PeriodInputProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  allowCurrentProject?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showDuration?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
  disabled?: boolean;
}

export const PeriodInput: React.FC<PeriodInputProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = '期間',
  required = false,
  error = false,
  helperText,
  allowCurrentProject = true,
  minDate,
  maxDate = new Date(),
  showDuration = true,
  variant = 'outlined',
  size = 'medium',
  disabled = false,
}) => {
  // 期間計算
  const duration = useMemo(() => {
    if (!startDate || !isValid(startDate)) {
      return null;
    }

    const end = endDate && isValid(endDate) ? endDate : new Date();
    const months = differenceInMonths(end, startDate);
    
    if (months < 0) {
      return null;
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) {
      return `${remainingMonths}ヶ月`;
    } else if (remainingMonths === 0) {
      return `${years}年`;
    } else {
      return `${years}年${remainingMonths}ヶ月`;
    }
  }, [startDate, endDate]);

  // バリデーション
  const validation = useMemo(() => {
    const errors: string[] = [];

    if (startDate && !isValid(startDate)) {
      errors.push('開始日の形式が正しくありません');
    }

    if (endDate && !isValid(endDate)) {
      errors.push('終了日の形式が正しくありません');
    }

    if (startDate && isValid(startDate)) {
      if (minDate && isBefore(startDate, minDate)) {
        errors.push(`開始日は${format(minDate, 'yyyy年MM月')}以降で入力してください`);
      }
      
      if (maxDate && isAfter(startDate, maxDate)) {
        errors.push(`開始日は${format(maxDate, 'yyyy年MM月')}以前で入力してください`);
      }
    }

    if (endDate && isValid(endDate)) {
      if (maxDate && isAfter(endDate, maxDate)) {
        errors.push(`終了日は${format(maxDate, 'yyyy年MM月')}以前で入力してください`);
      }
    }

    if (startDate && endDate && isValid(startDate) && isValid(endDate)) {
      if (isBefore(endDate, startDate)) {
        errors.push('終了日は開始日以降の日付を入力してください');
      }
    }

    return {
      hasError: errors.length > 0,
      message: errors.join('、'),
    };
  }, [startDate, endDate, minDate, maxDate]);

  const isError = error || validation.hasError;
  const errorMessage = helperText || validation.message;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <FormControl error={isError} fullWidth>
        {label && (
          <FormLabel component="legend" required={required}>
            {label}
          </FormLabel>
        )}
        
        <PeriodContainer>
          <DateFieldsContainer>
            <DatePicker
              label="開始日 *"
              value={startDate}
              onChange={onStartDateChange}
              disabled={disabled}
              minDate={minDate}
              maxDate={maxDate}
              format="yyyy年MM月"
              views={['year', 'month']}
              slotProps={{
                textField: {
                  variant,
                  size,
                  error: isError && !!startDate,
                  fullWidth: true,
                  sx: { minWidth: 180 },
                },
              }}
            />

            <DatePicker
              label={allowCurrentProject ? '終了日（現在進行中の場合は空欄）' : '終了日 *'}
              value={endDate}
              onChange={onEndDateChange}
              disabled={disabled}
              minDate={startDate || minDate}
              maxDate={maxDate}
              format="yyyy年MM月"
              views={['year', 'month']}
              slotProps={{
                textField: {
                  variant,
                  size,
                  error: isError && !!endDate,
                  fullWidth: true,
                  sx: { minWidth: 180 },
                },
              }}
            />
          </DateFieldsContainer>

          {/* 期間表示 */}
          {showDuration && duration && (
            <Box>
              <DurationChip
                label={`期間: ${duration}`}
                color="primary"
                variant="outlined"
                size="small"
              />
              {!endDate && allowCurrentProject && (
                <DurationChip
                  label="現在進行中"
                  color="success"
                  variant="filled"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          )}
        </PeriodContainer>

        {isError && errorMessage && (
          <FormHelperText>{errorMessage}</FormHelperText>
        )}
      </FormControl>
    </LocalizationProvider>
  );
};

interface YearMonthPickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  minDate?: Date;
  maxDate?: Date;
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
  disabled?: boolean;
}

export const YearMonthPicker: React.FC<YearMonthPickerProps> = ({
  value,
  onChange,
  label,
  required = false,
  error = false,
  helperText,
  minDate,
  maxDate = new Date(),
  variant = 'outlined',
  size = 'medium',
  disabled = false,
}) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <DatePicker
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        format="yyyy年MM月"
        views={['year', 'month']}
        slotProps={{
          textField: {
            variant,
            size,
            error,
            helperText,
            required,
            fullWidth: true,
          },
        }}
      />
    </LocalizationProvider>
  );
};

interface PeriodRangeProps {
  periods: Array<{
    startDate: Date | null;
    endDate: Date | null;
    label?: string;
  }>;
  showOverlap?: boolean;
}

export const PeriodRange: React.FC<PeriodRangeProps> = ({
  periods,
  showOverlap = false,
}) => {
  // 期間の重複チェック
  const overlaps = useMemo(() => {
    if (!showOverlap || periods.length < 2) return [];

    const overlappingPairs: Array<{ index1: number; index2: number }> = [];

    for (let i = 0; i < periods.length - 1; i++) {
      for (let j = i + 1; j < periods.length; j++) {
        const period1 = periods[i];
        const period2 = periods[j];

        if (!period1.startDate || !period2.startDate) continue;

        const end1 = period1.endDate || new Date();
        const end2 = period2.endDate || new Date();

        // 重複判定
        const overlapping = 
          isBefore(period1.startDate, end2) && 
          isBefore(period2.startDate, end1);

        if (overlapping) {
          overlappingPairs.push({ index1: i, index2: j });
        }
      }
    }

    return overlappingPairs;
  }, [periods, showOverlap]);

  const totalDuration = useMemo(() => {
    const validPeriods = periods.filter(p => p.startDate && isValid(p.startDate));
    
    if (validPeriods.length === 0) return null;

    const totalMonths = validPeriods.reduce((sum, period) => {
      const start = period.startDate!;
      const end = period.endDate && isValid(period.endDate) ? period.endDate : new Date();
      return sum + differenceInMonths(end, start);
    }, 0);

    if (totalMonths < 0) return null;

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    if (years === 0) {
      return `${months}ヶ月`;
    } else if (months === 0) {
      return `${years}年`;
    } else {
      return `${years}年${months}ヶ月`;
    }
  }, [periods]);

  return (
    <Box>
      {periods.map((period, index) => (
        <Box key={index} sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {period.label ? `${period.label}: ` : `期間${index + 1}: `}
            {period.startDate ? format(period.startDate, 'yyyy年MM月') : '未設定'}
            {' ～ '}
            {period.endDate ? format(period.endDate, 'yyyy年MM月') : '現在'}
          </Typography>
        </Box>
      ))}

      {totalDuration && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="primary" fontWeight={500}>
            合計期間: {totalDuration}
          </Typography>
        </Box>
      )}

      {overlaps.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="warning.main">
            ⚠️ 期間の重複があります
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PeriodInput;