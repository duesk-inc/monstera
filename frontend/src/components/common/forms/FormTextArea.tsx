import React from 'react';
import { 
  TextField, 
  TextFieldProps,
  Box,
  Typography 
} from '@mui/material';
import { UseFormRegisterReturn, FieldError } from 'react-hook-form';

// 基本Props型定義
interface BaseFormTextAreaProps {
  label: string;
  rows?: number;
  maxLength?: number;
  showCharacterCount?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  fullWidth?: boolean;
  textFieldProps?: Partial<TextFieldProps>;
}

// React Hook Form連携用Props
interface FormTextAreaProps extends BaseFormTextAreaProps {
  register: UseFormRegisterReturn;
  error?: FieldError;
  value?: string; // 文字数カウント用
}

/**
 * 統一されたTextAreaコンポーネント
 * 
 * 主な機能:
 * - React Hook Formとの完全連携
 * - 文字数カウント機能
 * - 統一された行数設定
 * - エラーハンドリング
 * - 既存実装との完全互換性
 */
function FormTextArea({
  register,
  label,
  rows = 3,
  maxLength,
  showCharacterCount = false,
  disabled = false,
  required = false,
  placeholder,
  fullWidth = true,
  textFieldProps,
  error,
  value = '',
}: FormTextAreaProps) {
  // 文字数カウント表示の判定
  const shouldShowCount = showCharacterCount || maxLength;
  const currentLength = value?.length || 0;

  // ヘルパーテキストの生成
  const getHelperText = () => {
    const errorMessage = error?.message;
    const countText = shouldShowCount ? `${currentLength}${maxLength ? `/${maxLength}` : ''}文字` : '';
    
    if (errorMessage && countText) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="error">
            {errorMessage}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {countText}
          </Typography>
        </Box>
      );
    }
    
    if (errorMessage) {
      return errorMessage;
    }
    
    if (countText) {
      return (
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            {countText}
          </Typography>
        </Box>
      );
    }
    
    return undefined;
  };

  return (
    <TextField
      {...register}
      label={label}
      multiline
      rows={rows}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      fullWidth={fullWidth}
      error={!!error}
      helperText={getHelperText()}
      inputProps={{
        maxLength,
        ...textFieldProps?.inputProps,
      }}
      {...textFieldProps}
    />
  );
}

export default FormTextArea; 