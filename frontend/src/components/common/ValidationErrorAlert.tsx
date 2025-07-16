import React from 'react';
import { Typography } from '@mui/material';
import { ErrorAlert } from './Alert';
import type { FieldError, FieldErrors } from 'react-hook-form';

export interface ValidationErrorAlertProps {
  /** フィールドエラーオブジェクト（react-hook-form用） */
  errors?: FieldErrors;
  /** 単一エラーメッセージ */
  error?: string | null;
  /** 単一フィールドエラー（react-hook-form用） */
  fieldError?: FieldError;
  /** カスタムエラーメッセージのマップ */
  customErrors?: Record<string, string>;
  /** エラータイトル */
  title?: string;
  /** 閉じるハンドラー */
  onClose?: () => void;
  /** 表示するフィールド名のマップ（日本語名） */
  fieldLabels?: Record<string, string>;
  /** 最大表示エラー数 */
  maxErrors?: number;
  /** 詳細表示モード */
  showDetails?: boolean;
}

/**
 * バリデーションエラーを統一的に表示するコンポーネント
 * react-hook-formのエラーオブジェクトや単純な文字列エラーに対応
 * 複数のエラーを整理して表示する機能を提供
 */
export const ValidationErrorAlert: React.FC<ValidationErrorAlertProps> = ({
  errors,
  error,
  fieldError,
  customErrors,
  title = '入力エラーがあります',
  onClose,
  fieldLabels = {},
  maxErrors = 5,
  showDetails = true,
}) => {
  // エラーメッセージを収集・整理
  const collectErrorMessages = (): string[] => {
    const messages: string[] = [];

    // 単一エラーメッセージの処理
    if (error) {
      messages.push(error);
    }

    // 単一フィールドエラーの処理
    if (fieldError?.message) {
      messages.push(fieldError.message);
    }

    // カスタムエラーの処理
    if (customErrors) {
      Object.values(customErrors).forEach(msg => {
        if (msg) messages.push(msg);
      });
    }

    // react-hook-formエラーオブジェクトの処理
    if (errors) {
      Object.entries(errors).forEach(([fieldName, fieldError]) => {
        if (fieldError && typeof fieldError === 'object' && 'message' in fieldError && typeof fieldError.message === 'string') {
          const fieldLabel = fieldLabels[fieldName] || fieldName;
          const message = showDetails 
            ? `${fieldLabel}: ${fieldError.message}`
            : fieldError.message;
          messages.push(message);
        }
      });
    }

    // 重複を除去し、最大表示数で制限
    const uniqueMessages = Array.from(new Set(messages));
    return uniqueMessages.slice(0, maxErrors);
  };

  const errorMessages = collectErrorMessages();

  // エラーがない場合は何も表示しない
  if (errorMessages.length === 0) {
    return null;
  }

  // 単一エラーの場合
  if (errorMessages.length === 1) {
    return (
      <ErrorAlert
        title={title}
        message={errorMessages[0]}
        onClose={onClose}
        sx={{ mb: 2 }}
      />
    );
  }

  // 複数エラーの場合
  const mainMessage = `${errorMessages.length}件の入力エラーがあります。以下の項目を確認してください。`;
  const detailsText = errorMessages.join('\n');

  return (
    <ErrorAlert
      title={title}
      message={mainMessage}
      details={showDetails ? detailsText : undefined}
      onClose={onClose}
      sx={{ mb: 2 }}
    />
  );
};

/**
 * フィールド固有のバリデーションエラー表示コンポーネント
 * 個別のフォームフィールドの下に表示するための軽量版
 */
export interface FieldValidationErrorProps {
  error?: FieldError | string;
  show?: boolean;
}

export const FieldValidationError: React.FC<FieldValidationErrorProps> = ({
  error,
  show = true,
}) => {
  if (!show || !error) {
    return null;
  }

  const message = typeof error === 'string' ? error : error.message;

  if (!message) {
    return null;
  }

  return (
    <Typography 
      variant="caption" 
      color="error" 
      sx={{ 
        display: 'block', 
        mt: 0.5,
        fontWeight: 400,
      }}
    >
      {message}
    </Typography>
  );
};

export default ValidationErrorAlert; 