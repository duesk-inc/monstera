import React from 'react';
import { Controller, FieldValues, Path, Control, FieldError, RegisterOptions } from 'react-hook-form';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { TextFieldProps } from '@mui/material';

// DatePickerの表示モード
export type DatePickerMode = 'date' | 'month-year';

// 基本Props型定義
interface BaseFormDatePickerProps<T extends FieldValues> {
  label: string;
  mode?: DatePickerMode;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
  textFieldProps?: Partial<TextFieldProps>;
  required?: boolean;
  rules?: RegisterOptions<T>;
}

// React Hook Form連携用Props
interface FormDatePickerProps<T extends FieldValues> extends BaseFormDatePickerProps<T> {
  name: Path<T>;
  control: Control<T>;
  error?: FieldError;
}

/**
 * 統一されたDatePickerコンポーネント
 * 
 * 主な機能:
 * - React Hook Formとの完全連携
 * - 日本語ロケール設定
 * - 年月選択モード対応
 * - 既存実装との完全互換性
 * - 統一されたエラーハンドリング
 */
function FormDatePicker<T extends FieldValues>({
  name,
  control,
  label,
  mode = 'date',
  disabled = false,
  maxDate,
  minDate,
  textFieldProps,
  error,
  required = false,
  rules,
}: FormDatePickerProps<T>) {
  // モードに応じた設定を決定
  const getDatePickerConfig = () => {
    switch (mode) {
      case 'month-year':
        return {
          views: ['year', 'month'] as const,
          openTo: 'year' as const,
          format: 'yyyy年MM月',
        };
      case 'date':
      default:
        return {
          views: ['year', 'month', 'day'] as const,
          openTo: 'day' as const,
          format: 'yyyy/MM/dd',
        };
    }
  };

  const config = getDatePickerConfig();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState }) => (
          <DatePicker
            label={label}
            value={field.value}
            onChange={(date) => field.onChange(date)}
            views={config.views}
            openTo={config.openTo}
            format={config.format}
            disabled={disabled}
            maxDate={maxDate}
            minDate={minDate}
            slotProps={{
              textField: {
                error: !!(fieldState.error || error),
                helperText: fieldState.error?.message || error?.message,
                required,
                fullWidth: true,
                ...textFieldProps,
              },
            }}
          />
        )}
      />
    </LocalizationProvider>
  );
}

export default FormDatePicker; 