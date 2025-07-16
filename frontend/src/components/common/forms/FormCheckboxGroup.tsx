import React from 'react';
import { Controller, FieldValues, Path, Control, FieldError, RegisterOptions } from 'react-hook-form';
import {
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  FormGroupProps,
} from '@mui/material';

// 選択肢の型定義
export interface CheckboxOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// レイアウト方向
export type CheckboxDirection = 'row' | 'column';

// 基本Props型定義
interface BaseFormCheckboxGroupProps<T extends FieldValues> {
  label: string;
  options: CheckboxOption[];
  direction?: CheckboxDirection;
  disabled?: boolean;
  required?: boolean;
  formGroupProps?: Partial<FormGroupProps>;
  rules?: RegisterOptions<T>;
}

// React Hook Form連携用Props
interface FormCheckboxGroupProps<T extends FieldValues> extends BaseFormCheckboxGroupProps<T> {
  name: Path<T>;
  control: Control<T>;
  error?: FieldError;
}

/**
 * 統一されたCheckboxGroupコンポーネント
 * 
 * 主な機能:
 * - React Hook Formとの完全連携
 * - 複数選択値の配列管理
 * - オプション配列からのCheckbox自動生成
 * - 横並び/縦並びレイアウト対応
 * - エラーハンドリング
 * - 既存実装との完全互換性
 */
function FormCheckboxGroup<T extends FieldValues>({
  name,
  control,
  label,
  options,
  direction = 'column',
  disabled = false,
  required = false,
  formGroupProps,
  error,
  rules,
}: FormCheckboxGroupProps<T>) {
  return (
    <FormControl component="fieldset" error={!!error} disabled={disabled}>
      <FormLabel component="legend" required={required}>
        {label}
      </FormLabel>
      <Controller
        name={name}
        control={control}
        defaultValue={[] as T[Path<T>]}
        rules={rules}
        render={({ field, fieldState }) => (
          <>
            <FormGroup row={direction === 'row'} {...formGroupProps}>
              {options.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={field.value?.includes(option.value) || false}
                      onChange={(e) => {
                        const currentValues = field.value || [];
                        const updatedValues = e.target.checked
                          ? [...currentValues, option.value]
                          : currentValues.filter((value: string | number) => value !== option.value);
                        field.onChange(updatedValues);
                      }}
                      disabled={option.disabled || disabled}
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
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

export default FormCheckboxGroup; 