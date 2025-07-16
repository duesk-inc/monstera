import React from 'react';
import { Alert, AlertTitle, Typography, SxProps, Theme } from '@mui/material';
import ActionButton from '@/components/common/ActionButton';

export interface UnifiedAlertProps {
  severity: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  details?: string;
  onClose?: () => void;
  action?: React.ReactNode;
  retryAction?: () => void;
  sx?: SxProps<Theme>;
  variant?: 'standard' | 'filled' | 'outlined';
}

/**
 * 統一されたAlertコンポーネント
 * 成功、エラー、警告、情報メッセージを統一されたスタイルで表示します
 */
export const UnifiedAlert: React.FC<UnifiedAlertProps> = ({
  severity,
  message,
  title,
  details,
  onClose,
  action,
  retryAction,
  sx,
  variant = 'standard',
}) => {
  // アクションボタンを構築
  const alertAction = action || (retryAction && (
    <ActionButton 
      buttonType="ghost" 
      size="small" 
      onClick={retryAction}
      sx={{ color: 'inherit' }}
    >
      再試行
    </ActionButton>
  ));

  return (
    <Alert 
      severity={severity}
      variant={variant}
      onClose={onClose}
      action={alertAction}
      sx={{ mb: 2, ...sx }}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
      {details && (
        <Typography variant="caption" component="div" sx={{ mt: 1 }}>
          {details}
        </Typography>
      )}
    </Alert>
  );
};

// 特化版コンポーネントの型定義
export type SuccessAlertProps = Omit<UnifiedAlertProps, 'severity'>;
export type ErrorAlertProps = Omit<UnifiedAlertProps, 'severity'>;
export type WarningAlertProps = Omit<UnifiedAlertProps, 'severity'>;
export type InfoAlertProps = Omit<UnifiedAlertProps, 'severity'>;

/**
 * 成功通知専用Alertコンポーネント
 */
export const SuccessAlert: React.FC<SuccessAlertProps> = (props) => (
  <UnifiedAlert severity="success" {...props} />
);

/**
 * エラー通知専用Alertコンポーネント
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = (props) => (
  <UnifiedAlert severity="error" {...props} />
);

/**
 * 警告通知専用Alertコンポーネント
 */
export const WarningAlert: React.FC<WarningAlertProps> = (props) => (
  <UnifiedAlert severity="warning" {...props} />
);

/**
 * 情報通知専用Alertコンポーネント
 */
export const InfoAlert: React.FC<InfoAlertProps> = (props) => (
  <UnifiedAlert severity="info" {...props} />
); 