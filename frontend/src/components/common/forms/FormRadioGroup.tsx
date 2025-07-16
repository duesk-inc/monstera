import React from 'react';
import { Controller, FieldValues, Path, Control, FieldError } from 'react-hook-form';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormHelperText,
  RadioGroupProps,
} from '@mui/material';

// 選択肢の型定義
export interface RadioOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// レイアウト方向
export type RadioDirection = 'row' | 'column';

// 基本Props型定義
interface BaseFormRadioGroupProps {
  label: string;
  options: RadioOption[];
  direction?: RadioDirection;
  disabled?: boolean;
  required?: boolean;
  radioGroupProps?: Partial<RadioGroupProps>;
}

// React Hook Form連携用Props
interface ControlledFormRadioGroupProps<T extends FieldValues> extends BaseFormRadioGroupProps {
  name: Path<T>;
  control: Control<T>;
  error?: FieldError;
  value?: never;
  onChange?: never;
}

// 通常の状態管理用Props
interface UncontrolledFormRadioGroupProps extends BaseFormRadioGroupProps {
  name: string;
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  control?: never;
  error?: FieldError;
}

// 統合Props型
type FormRadioGroupProps<T extends FieldValues = FieldValues> = 
  | ControlledFormRadioGroupProps<T>
  | UncontrolledFormRadioGroupProps;

/**
 * 統一されたRadioGroupコンポーネント
 * 
 * 主な機能:
 * - React Hook Form連携とUncontrolled両方に対応
 * - オプション配列からのRadio自動生成
 * - 横並び/縦並びレイアウト対応
 * - エラーハンドリング
 * - 既存実装との完全互換性
 */
function FormRadioGroup<T extends FieldValues = FieldValues>(props: FormRadioGroupProps<T>) {
  const {
    label,
    options,
    direction = 'column',
    disabled = false,
    required = false,
    radioGroupProps,
    error,
  } = props;

  // React Hook Form連携用
  if ('control' in props && props.control) {
    const { name, control } = props;
    return (
      <FormControl component="fieldset" error={!!error} disabled={disabled}>
        <FormLabel component="legend" required={required}>
          {label}
        </FormLabel>
        <Controller
          name={name}
          control={control}
          render={({ field, fieldState }) => (
            <>
              <RadioGroup
                {...field}
                row={direction === 'row'}
                {...radioGroupProps}
              >
                {options.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio />}
                    label={option.label}
                    disabled={option.disabled || disabled}
                  />
                ))}
              </RadioGroup>
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

  // 通常の状態管理用
  const { name, value, onChange } = props as UncontrolledFormRadioGroupProps;
  return (
    <FormControl component="fieldset" error={!!error} disabled={disabled}>
      <FormLabel component="legend" required={required}>
        {label}
      </FormLabel>
      <RadioGroup
        name={name}
        value={value}
        onChange={onChange}
        row={direction === 'row'}
        {...radioGroupProps}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={option.label}
            disabled={option.disabled || disabled}
          />
        ))}
      </RadioGroup>
      {error && (
        <FormHelperText>
          {error.message}
        </FormHelperText>
      )}
    </FormControl>
  );
}

export default FormRadioGroup; 