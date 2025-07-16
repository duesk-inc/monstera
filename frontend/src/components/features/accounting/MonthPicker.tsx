// 月選択コンポーネント

import React, { useMemo, useState } from "react";
import {
  TextField,
  MenuItem,
  Box,
  Typography,
  FormControl,
  FormLabel,
  FormHelperText,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  Button,
  Menu,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import {
  CalendarToday,
  NavigateBefore,
  NavigateNext,
  Today,
  KeyboardArrowDown,
  Clear,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ja } from "date-fns/locale";
import { format, addMonths, subMonths, parseISO } from "date-fns";

// ========== 型定義 ==========

export interface MonthPickerProps {
  value: string; // YYYY-MM format
  onChange: (month: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  variant?: "outlined" | "filled" | "standard";
  size?: "small" | "medium";
  fullWidth?: boolean;
  minMonth?: string; // YYYY-MM format
  maxMonth?: string; // YYYY-MM format
  showClearButton?: boolean;
  showTodayButton?: boolean;
  yearRange?: {
    start?: number;
    end?: number;
  };
  quickSelections?: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
  displayFormat?: "YYYY年MM月" | "YYYY/MM" | "MM/YYYY" | "custom";
  customDisplayFormat?: (date: Date) => string;
}

export interface MonthRangePickerProps {
  startMonth: string;
  endMonth: string;
  onChange: (startMonth: string, endMonth: string) => void;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  maxRange?: number; // 最大選択可能月数
}

export interface QuickMonthSelectProps {
  value: string;
  onChange: (month: string) => void;
  disabled?: boolean;
  showYearOnly?: boolean;
}

// ========== ユーティリティ関数 ==========

// 月文字列をDateオブジェクトに変換
const monthStringToDate = (monthString: string): Date => {
  return parseISO(`${monthString}-01`);
};

// Dateオブジェクトを月文字列に変換
const dateToMonthString = (date: Date): string => {
  return format(date, "yyyy-MM");
};

// 月の表示形式
const formatMonthDisplay = (
  monthString: string,
  displayFormat: string = "YYYY年MM月",
  customFormatter?: (date: Date) => string,
): string => {
  const date = monthStringToDate(monthString);

  if (customFormatter) {
    return customFormatter(date);
  }

  switch (displayFormat) {
    case "YYYY年MM月":
      return format(date, "yyyy年MM月", { locale: ja });
    case "YYYY/MM":
      return format(date, "yyyy/MM");
    case "MM/YYYY":
      return format(date, "MM/yyyy");
    default:
      return format(date, "yyyy年MM月", { locale: ja });
  }
};

// 月の範囲を生成
const generateMonthRange = (
  startYear: number,
  endYear: number,
  minMonth?: string,
  maxMonth?: string,
): Array<{ value: string; label: string; year: number; month: number }> => {
  const months = [];

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthString = `${year}-${month.toString().padStart(2, "0")}`;

      // 最小・最大月の制限チェック
      if (minMonth && monthString < minMonth) continue;
      if (maxMonth && monthString > maxMonth) continue;

      months.push({
        value: monthString,
        label: formatMonthDisplay(monthString),
        year,
        month,
      });
    }
  }

  return months;
};

// クイック選択のデフォルト値
const getDefaultQuickSelections = (): Array<{
  label: string;
  value: string;
  description?: string;
}> => {
  const now = new Date();
  const currentMonth = dateToMonthString(now);
  const lastMonth = dateToMonthString(subMonths(now, 1));
  const nextMonth = dateToMonthString(addMonths(now, 1));

  return [
    {
      label: "今月",
      value: currentMonth,
      description: formatMonthDisplay(currentMonth),
    },
    {
      label: "先月",
      value: lastMonth,
      description: formatMonthDisplay(lastMonth),
    },
    {
      label: "来月",
      value: nextMonth,
      description: formatMonthDisplay(nextMonth),
    },
  ];
};

// ========== メインコンポーネント ==========

export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  label = "月を選択",
  placeholder = "月を選択してください",
  helperText,
  required = false,
  disabled = false,
  error = false,
  variant = "outlined",
  size = "medium",
  fullWidth = false,
  minMonth,
  maxMonth,
  showClearButton = true,
  showTodayButton = true,
  yearRange = {
    start: new Date().getFullYear() - 5,
    end: new Date().getFullYear() + 2,
  },
  quickSelections = getDefaultQuickSelections(),
  displayFormat = "YYYY年MM月",
  customDisplayFormat,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    value ? monthStringToDate(value).getFullYear() : new Date().getFullYear(),
  );

  // 利用可能な月のリスト
  const availableMonths = useMemo(() => {
    return generateMonthRange(
      yearRange.start || new Date().getFullYear() - 5,
      yearRange.end || new Date().getFullYear() + 2,
      minMonth,
      maxMonth,
    );
  }, [yearRange, minMonth, maxMonth]);

  // 利用可能な年のリスト
  const availableYears = useMemo(() => {
    const years = new Set(availableMonths.map((m) => m.year));
    return Array.from(years).sort((a, b) => a - b);
  }, [availableMonths]);

  // 選択された年の月リスト
  const monthsInSelectedYear = useMemo(() => {
    return availableMonths.filter((m) => m.year === selectedYear);
  }, [availableMonths, selectedYear]);

  // メニューの開閉
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    if (value) {
      setSelectedYear(monthStringToDate(value).getFullYear());
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // 月選択
  const handleMonthSelect = (monthString: string) => {
    onChange(monthString);
    handleMenuClose();
  };

  // クリア
  const handleClear = () => {
    onChange("");
  };

  // 今月選択
  const handleToday = () => {
    const today = new Date();
    onChange(dateToMonthString(today));
  };

  // 年変更
  const handleYearChange = (direction: "prev" | "next") => {
    const currentIndex = availableYears.indexOf(selectedYear);
    if (direction === "prev" && currentIndex > 0) {
      setSelectedYear(availableYears[currentIndex - 1]);
    } else if (
      direction === "next" &&
      currentIndex < availableYears.length - 1
    ) {
      setSelectedYear(availableYears[currentIndex + 1]);
    }
  };

  const displayValue = value
    ? formatMonthDisplay(value, displayFormat, customDisplayFormat)
    : "";

  return (
    <FormControl fullWidth={fullWidth} required={required} error={error}>
      {label && <FormLabel component="legend">{label}</FormLabel>}

      <Box sx={{ mt: label ? 1 : 0 }}>
        <TextField
          value={displayValue}
          placeholder={placeholder}
          onClick={handleMenuOpen}
          variant={variant as "outlined" | "filled" | "standard"}
          size={size as "small" | "medium"}
          disabled={disabled}
          error={error}
          fullWidth={fullWidth}
          InputProps={{
            readOnly: true,
            startAdornment: (
              <CalendarToday sx={{ mr: 1, color: "action.active" }} />
            ),
            endAdornment: (
              <Stack direction="row" spacing={0.5}>
                {value && showClearButton && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                    disabled={disabled}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                )}
                <KeyboardArrowDown />
              </Stack>
            ),
          }}
          sx={{
            cursor: disabled ? "default" : "pointer",
            "& .MuiInputBase-input": {
              cursor: disabled ? "default" : "pointer",
            },
          }}
        />

        {/* カスタム月選択メニュー */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              width: 320,
              maxHeight: 400,
            },
          }}
        >
          {/* クイック選択 */}
          {quickSelections.length > 0 && (
            <>
              <Box sx={{ p: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ px: 1 }}
                >
                  クイック選択
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}
                >
                  {quickSelections.map((quick) => (
                    <Chip
                      key={quick.value}
                      label={quick.label}
                      size="small"
                      variant={value === quick.value ? "filled" : "outlined"}
                      onClick={() => handleMonthSelect(quick.value)}
                      clickable
                    />
                  ))}
                  {showTodayButton && (
                    <Chip
                      label="今月"
                      size="small"
                      variant="outlined"
                      icon={<Today fontSize="small" />}
                      onClick={handleToday}
                      clickable
                    />
                  )}
                </Stack>
              </Box>
              <Divider />
            </>
          )}

          {/* 年選択ヘッダー */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            <IconButton
              size="small"
              onClick={() => handleYearChange("prev")}
              disabled={availableYears.indexOf(selectedYear) === 0}
            >
              <NavigateBefore />
            </IconButton>
            <Typography variant="subtitle1" fontWeight={600}>
              {selectedYear}年
            </Typography>
            <IconButton
              size="small"
              onClick={() => handleYearChange("next")}
              disabled={
                availableYears.indexOf(selectedYear) ===
                availableYears.length - 1
              }
            >
              <NavigateNext />
            </IconButton>
          </Box>

          {/* 月選択グリッド */}
          <Box sx={{ p: 1 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 0.5,
              }}
            >
              {Array.from({ length: 12 }, (_, index) => {
                const month = index + 1;
                const monthString = `${selectedYear}-${month.toString().padStart(2, "0")}`;
                const isAvailable = monthsInSelectedYear.some(
                  (m) => m.month === month,
                );
                const isSelected = value === monthString;
                const isDisabled = !isAvailable;

                return (
                  <Button
                    key={month}
                    fullWidth
                    variant={isSelected ? "contained" : "text"}
                    size="small"
                    onClick={() => handleMonthSelect(monthString)}
                    disabled={isDisabled}
                    sx={{
                      minHeight: 36,
                      fontSize: "0.75rem",
                      opacity: isDisabled ? 0.3 : 1,
                    }}
                  >
                    {month}月
                  </Button>
                );
              })}
            </Box>
          </Box>
        </Menu>

        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </Box>
    </FormControl>
  );
};

// ========== 月範囲選択コンポーネント ==========

export const MonthRangePicker: React.FC<MonthRangePickerProps> = ({
  startMonth,
  endMonth,
  onChange,
  label = "期間を選択",
  disabled = false,
  error = false,
  helperText,
  maxRange = 12,
}) => {
  const handleStartMonthChange = (month: string) => {
    onChange(month, endMonth);

    // 終了月が開始月より前の場合は調整
    if (endMonth && month > endMonth) {
      onChange(month, month);
    }
  };

  const handleEndMonthChange = (month: string) => {
    onChange(startMonth, month);

    // 開始月が終了月より後の場合は調整
    if (startMonth && month < startMonth) {
      onChange(month, month);
    }
  };

  // 範囲チェック
  const isRangeValid = useMemo(() => {
    if (!startMonth || !endMonth) return true;

    const start = monthStringToDate(startMonth);
    const end = monthStringToDate(endMonth);
    const monthDiff =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1;

    return monthDiff <= maxRange;
  }, [startMonth, endMonth, maxRange]);

  return (
    <FormControl fullWidth error={error || !isRangeValid}>
      {label && <FormLabel component="legend">{label}</FormLabel>}

      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ mt: label ? 1 : 0 }}
      >
        <MonthPicker
          value={startMonth}
          onChange={handleStartMonthChange}
          label="開始月"
          placeholder="開始月を選択"
          disabled={disabled}
          maxMonth={endMonth || undefined}
          showClearButton={false}
        />
        <Typography color="text.secondary">〜</Typography>
        <MonthPicker
          value={endMonth}
          onChange={handleEndMonthChange}
          label="終了月"
          placeholder="終了月を選択"
          disabled={disabled}
          minMonth={startMonth || undefined}
          showClearButton={false}
        />
      </Stack>

      {(helperText || !isRangeValid) && (
        <FormHelperText>
          {!isRangeValid
            ? `選択可能な期間は最大${maxRange}ヶ月です`
            : helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
};

// ========== クイック月選択コンポーネント ==========

export const QuickMonthSelect: React.FC<QuickMonthSelectProps> = ({
  value,
  onChange,
  disabled = false,
  showYearOnly = false,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const currentDate = new Date();
  const currentMonth = dateToMonthString(currentDate);

  // クイック選択オプション
  const quickOptions = useMemo(() => {
    const options = [];
    const now = new Date();

    if (showYearOnly) {
      // 年選択モード
      for (let i = -2; i <= 1; i++) {
        const year = now.getFullYear() + i;
        const yearStart = `${year}-01`;
        options.push({
          label: `${year}年`,
          value: yearStart,
          isCurrent: year === now.getFullYear(),
        });
      }
    } else {
      // 月選択モード
      for (let i = -3; i <= 2; i++) {
        const date = addMonths(now, i);
        const monthString = dateToMonthString(date);
        options.push({
          label: formatMonthDisplay(monthString),
          value: monthString,
          isCurrent: i === 0,
          isLast: i === -1,
          isNext: i === 1,
        });
      }
    }

    return options;
  }, [showYearOnly]);

  const selectedOption = quickOptions.find((opt) => opt.value === value);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    handleMenuClose();
  };

  return (
    <>
      <Chip
        label={selectedOption?.label || "月を選択"}
        onClick={handleMenuOpen}
        disabled={disabled}
        icon={<CalendarToday fontSize="small" />}
        variant={value ? "filled" : "outlined"}
        clickable
        sx={{
          cursor: disabled ? "default" : "pointer",
        }}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 180 },
        }}
      >
        {quickOptions.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === value}
            onClick={() => handleOptionSelect(option.value)}
            sx={{
              fontWeight: option.isCurrent ? 600 : 400,
              color: option.isCurrent ? theme.palette.primary.main : "inherit",
            }}
          >
            <ListItemText
              primary={option.label}
              secondary={
                option.isCurrent
                  ? "今月"
                  : option.isLast
                    ? "先月"
                    : option.isNext
                      ? "来月"
                      : undefined
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

// ========== DatePicker連携コンポーネント ==========

export interface DatePickerMonthSelectorProps {
  value: string;
  onChange: (month: string) => void;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

export const DatePickerMonthSelector: React.FC<
  DatePickerMonthSelectorProps
> = ({
  value,
  onChange,
  label = "月を選択",
  disabled = false,
  error = false,
  helperText,
}) => {
  const selectedDate = value ? monthStringToDate(value) : null;

  const handleDateChange = (date: Date | null) => {
    if (date) {
      onChange(dateToMonthString(date));
    } else {
      onChange("");
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <DatePicker
        label={label}
        value={selectedDate}
        onChange={handleDateChange}
        disabled={disabled}
        views={["year", "month"]}
        openTo="month"
        slotProps={{
          textField: {
            error: error,
            helperText: helperText,
            InputProps: {
              startAdornment: (
                <CalendarToday sx={{ mr: 1, color: "action.active" }} />
              ),
            },
          },
        }}
      />
    </LocalizationProvider>
  );
};

// ========== シンプル版コンポーネント ==========

export interface SimpleMonthPickerProps {
  value: string;
  onChange: (month: string) => void;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  size?: "small" | "medium";
}

export const SimpleMonthPicker: React.FC<SimpleMonthPickerProps> = ({
  value,
  onChange,
  label = "月",
  disabled = false,
  error = false,
  size = "small",
}) => {
  const availableMonths = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return generateMonthRange(currentYear - 1, currentYear + 1);
  }, []);

  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      error={error}
      size={size as "small" | "medium"}
      variant="outlined"
    >
      {availableMonths.map((month) => (
        <MenuItem key={month.value} value={month.value}>
          {month.label}
        </MenuItem>
      ))}
    </TextField>
  );
};
