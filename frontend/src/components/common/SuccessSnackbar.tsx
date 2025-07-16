import React, { useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useToast } from './Toast';
import { UI_DELAYS } from '@/constants/delays';

export interface SuccessSnackbarProps {
  open: boolean;
  message: string;
  onClose: () => void;
  autoHideDuration?: number;
  success?: boolean;
}

/**
 * 成功・エラー通知用のスナックバーコンポーネント
 * @deprecated 新しいコードではuseToastフックを使用してください
 */
export const SuccessSnackbar: React.FC<SuccessSnackbarProps> = ({
  open,
  message,
  onClose,
  autoHideDuration = 6000,
  success = true,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        onClose={onClose} 
        severity={success ? "success" : "error"}
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

/**
 * 新しいToastシステムを使用するSuccessSnackbarの代替コンポーネント
 * 既存コードの段階的移行用
 */
export const SuccessSnackbarV2: React.FC<SuccessSnackbarProps> = ({
  open,
  message,
  onClose,
  autoHideDuration = 6000,
  success = true,
}) => {
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (open) {
      if (success) {
        showSuccess(message, { duration: autoHideDuration });
      } else {
        showError(message, { duration: autoHideDuration });
      }
      // Toast表示後、親コンポーネントの状態をリセット
      setTimeout(onClose, UI_DELAYS.SNACKBAR_CLOSE);
    }
  }, [open, message, success, autoHideDuration, showSuccess, showError, onClose]);

  // 新システムでは実際のSnackbarは表示しない（ToastProviderが管理）
  return null;
}; 