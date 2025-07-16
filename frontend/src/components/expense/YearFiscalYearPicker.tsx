import React, { useState, useCallback } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Chip,
  Typography,
} from '@mui/material';
import { useExpenseFiscalYear, getCurrentFiscalYear } from '@/hooks/expense/useExpenseFiscalYear';

interface YearFiscalYearPickerProps {
  onYearChange?: (year: number, isFiscalYear: boolean) => void;
  initialYear?: number;
  initialIsFiscalYear?: boolean;
  disabled?: boolean;
}

/**
 * 年度・会計年度選択コンポーネント
 * カレンダー年度（1-12月）と会計年度（4-3月）の両方をサポート
 */
export const YearFiscalYearPicker: React.FC<YearFiscalYearPickerProps> = ({
  onYearChange,
  initialYear,
  initialIsFiscalYear = false,
  disabled = false,
}) => {
  const {
    generateYearOptions,
    formatFiscalYearLabel,
    formatCalendarYearLabel,
  } = useExpenseFiscalYear({ autoFetch: false });

  // 現在の年度を取得
  const currentCalendarYear = new Date().getFullYear();
  const currentFiscalYear = getCurrentFiscalYear();

  // 初期値設定
  const [selectedValue, setSelectedValue] = useState<string>(() => {
    const year = initialYear || (initialIsFiscalYear ? currentFiscalYear : currentCalendarYear);
    const isFiscal = initialIsFiscalYear;
    return `${year}-${isFiscal ? 'fiscal' : 'calendar'}`;
  });

  // 年度オプションを生成
  const yearOptions = generateYearOptions(10);

  // 選択変更ハンドラ
  const handleChange = useCallback((event: SelectChangeEvent) => {
    const value = event.target.value;
    setSelectedValue(value);

    // 値を解析してコールバック実行
    const [yearStr, typeStr] = value.split('-');
    const year = parseInt(yearStr, 10);
    const isFiscalYear = typeStr === 'fiscal';

    onYearChange?.(year, isFiscalYear);
  }, [onYearChange]);

  // 現在選択されている年度情報を取得
  const selectedInfo = yearOptions.find(option => 
    `${option.value}-${option.isFiscal ? 'fiscal' : 'calendar'}` === selectedValue
  );

  return (
    <Box>
      <FormControl fullWidth size="small" disabled={disabled}>
        <InputLabel id="year-fiscal-year-picker-label">年度選択</InputLabel>
        <Select
          labelId="year-fiscal-year-picker-label"
          id="year-fiscal-year-picker"
          value={selectedValue}
          label="年度選択"
          onChange={handleChange}
        >
          {yearOptions.map((option) => {
            const value = `${option.value}-${option.isFiscal ? 'fiscal' : 'calendar'}`;
            return (
              <MenuItem key={value} value={value}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography>{option.label}</Typography>
                  <Chip
                    label={option.isFiscal ? '会計年度' : 'カレンダー年'}
                    size="small"
                    color={option.isFiscal ? 'primary' : 'default'}
                    variant="outlined"
                  />
                </Box>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {/* 選択中の年度情報表示 */}
      {selectedInfo && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            選択中: {selectedInfo.label}
            {selectedInfo.isFiscal ? (
              <span> (4月～翌年3月)</span>
            ) : (
              <span> (1月～12月)</span>
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default YearFiscalYearPicker;