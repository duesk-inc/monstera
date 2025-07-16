import React from 'react';
import { Alert, AlertTitle, Typography } from '@mui/material';
import ActionButton from '@/components/common/ActionButton';
import { ErrorAlert } from './Alert';

export interface ApiError {
  message: string;
  title?: string;
  details?: string;
  retryAction?: () => void;
}

export interface ErrorDisplayProps {
  error: ApiError | null;
}

/**
 * API通信などのエラーを表示するコンポーネント
 * 再試行ボタンを含めることができる
 * @deprecated 新しいコードではErrorAlertコンポーネントを使用してください
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  if (!error) return null;
  
  return (
    <Alert 
      severity="error" 
      sx={{ mb: 3 }}
      action={
        error.retryAction && (
          <ActionButton 
            buttonType="ghost" 
            size="small" 
            onClick={error.retryAction}
            sx={{ color: 'inherit' }}
          >
            再試行
          </ActionButton>
        )
      }
    >
      <AlertTitle>{error.title || 'エラーが発生しました'}</AlertTitle>
      {error.message}
      {error.details && (
        <Typography variant="caption" component="div" sx={{ mt: 1 }}>
          {error.details}
        </Typography>
      )}
    </Alert>
  );
};

/**
 * 新しいAlertシステムを使用するErrorDisplayの代替コンポーネント
 * 既存コードの段階的移行用
 */
export const ErrorDisplayV2: React.FC<ErrorDisplayProps> = ({ error }) => {
  if (!error) return null;
  
  return (
    <ErrorAlert
      message={error.message}
      title={error.title || 'エラーが発生しました'}
      details={error.details}
      retryAction={error.retryAction}
      sx={{ mb: 3 }}
    />
  );
}; 