import React from 'react';
import { Controller, FieldValues, Path, Control, FieldError, RegisterOptions } from 'react-hook-form';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectProps,
} from '@mui/material';

// 選択肢の型定義
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// 基本Props型定義
interface BaseFormSelectProps<T extends FieldValues> {
  label: string;
  options: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  selectProps?: Partial<SelectProps>;
  rules?: RegisterOptions<T>;
  startAdornment?: React.ReactNode;
}

// React Hook Form連携用Props
interface FormSelectProps<T extends FieldValues> extends BaseFormSelectProps<T> {
  name: Path<T>;
  control: Control<T>;
  error?: FieldError;
}

/**
 * 統一されたSelectコンポーネント
 * 
 * 主な機能:
 * - React Hook Formとの完全連携
 * - オプション配列からのMenuItem自動生成
 * - 統一された高さとスタイル
 * - エラーハンドリング
 * - 既存実装との完全互換性
 */
function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  disabled = false,
  required = false,
  placeholder,
  size = 'medium',
  fullWidth = true,
  selectProps,
  error,
  rules,
  startAdornment,
}: FormSelectProps<T>) {
  // ラベルIDを生成（アクセシビリティ対応）
  const labelId = `${name}-label`;

  return (
    <FormControl 
      fullWidth={fullWidth} 
      error={!!error} 
      size={size}
      disabled={disabled}
    >
      <InputLabel 
        id={labelId} 
        required={required}
        sx={startAdornment ? { 
          marginLeft: '40px',
          '&.MuiInputLabel-shrink': {
            marginLeft: 0,
          }
        } : undefined}
      >
        {label}
      </InputLabel>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState }) => (
          <>
            <Select
              {...field}
              labelId={labelId}
              label={label}
              displayEmpty={!!placeholder}
              startAdornment={startAdornment}
              sx={{
                // テーマで設定されたSELECT_HEIGHTを使用
                height: size === 'small' ? 40 : 56,
                ...(startAdornment ? {
                  '& .MuiSelect-select': {
                    paddingLeft: '40px',
                  }
                } : {}),
                ...selectProps?.sx,
              }}
              {...selectProps}
            >
              {placeholder && (
                <MenuItem value="" disabled>
                  {placeholder}
                </MenuItem>
              )}
              {options.map((option) => (
                <MenuItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(fieldState.error || error) && (
              <FormHelperText>
                {fieldState.error?.message || error?.message}
              </FormHelperText>
            )}
          </>
        )}
      />
    </FormControl>
  );
}

export default FormSelect; 