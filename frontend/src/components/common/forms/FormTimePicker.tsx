import React from 'react';
import { Controller, FieldValues, Path, Control, FieldError } from 'react-hook-form';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { TextFieldProps, InputAdornment } from '@mui/material';
import { AccessTime as TimeIcon } from '@mui/icons-material';

// 基本Props型定義
interface BaseFormTimePickerProps {
  label: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  textFieldProps?: Partial<TextFieldProps>;
  required?: boolean;
  showTimeIcon?: boolean;
  iconColor?: 'inherit' | 'action' | 'disabled' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

// React Hook Form連携用Props
interface FormTimePickerProps<T extends FieldValues> extends BaseFormTimePickerProps {
  name: Path<T>;
  control: Control<T>;
  error?: FieldError;
}

/**
 * 統一されたTimePickerコンポーネント
 * 
 * 主な機能:
 * - React Hook Formとの完全連携
 * - 日本語ロケール設定
 * - タイムアイコン表示対応
 * - 既存実装との完全互換性
 * - 統一されたエラーハンドリング
 */
function FormTimePicker<T extends FieldValues>({
  name,
  control,
  label,
  disabled = false,
  size = 'small',
  textFieldProps,
  error,
  required = false,
  showTimeIcon = true,
  iconColor = 'inherit',
}: FormTimePickerProps<T>) {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <TimePicker
            label={label}
            value={field.value}
            onChange={(time) => field.onChange(time)}
            disabled={disabled}
            slotProps={{
              textField: {
                size,
                fullWidth: true,
                error: !!(fieldState.error || error),
                helperText: fieldState.error?.message || error?.message,
                required,
                InputProps: showTimeIcon ? {
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon fontSize="small" color={iconColor || 'inherit'} />
                    </InputAdornment>
                  ),
                  ...textFieldProps?.InputProps,
                } : textFieldProps?.InputProps,
                ...textFieldProps,
              },
            }}
          />
        )}
      />
    </LocalizationProvider>
  );
}

export default FormTimePicker; 