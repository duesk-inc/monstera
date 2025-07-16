import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  position?: 'top' | 'bottom';
  title?: string;
}

interface ToastState extends ToastOptions {
  id: string;
  open: boolean;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  showSuccess: (message: string, options?: Partial<ToastOptions>) => void;
  showError: (message: string, options?: Partial<ToastOptions>) => void;
  showWarning: (message: string, options?: Partial<ToastOptions>) => void;
  showInfo: (message: string, options?: Partial<ToastOptions>) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export interface ToastProviderProps {
  children: React.ReactNode;
  defaultDuration?: number;
  defaultPosition?: 'top' | 'bottom';
}

/**
 * 統一されたToast通知システムのProvider
 * アプリケーション全体でToast通知を管理します
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  defaultDuration = 6000,
  defaultPosition = 'bottom',
}) => {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToast({
      id,
      open: true,
      duration: defaultDuration,
      position: defaultPosition,
      ...options,
    });
  }, [defaultDuration, defaultPosition]);

  const showSuccess = useCallback((message: string, options?: Partial<ToastOptions>) => {
    showToast({ type: 'success', message, ...options });
  }, [showToast]);

  const showError = useCallback((message: string, options?: Partial<ToastOptions>) => {
    showToast({ type: 'error', message, ...options });
  }, [showToast]);

  const showWarning = useCallback((message: string, options?: Partial<ToastOptions>) => {
    showToast({ type: 'warning', message, ...options });
  }, [showToast]);

  const showInfo = useCallback((message: string, options?: Partial<ToastOptions>) => {
    showToast({ type: 'info', message, ...options });
  }, [showToast]);

  const hideToast = useCallback(() => {
    if (toast) {
      setToast({ ...toast, open: false });
    }
  }, [toast]);

  const handleClose = useCallback((event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    hideToast();
  }, [hideToast]);

  const value: ToastContextValue = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Snackbar
          open={toast.open}
          autoHideDuration={toast.duration}
          onClose={handleClose}
          anchorOrigin={{
            vertical: toast.position === 'top' ? 'top' : 'bottom',
            horizontal: 'center',
          }}
        >
          <Alert
            onClose={handleClose}
            severity={toast.type}
            sx={{ width: '100%' }}
            data-testid={`toast-${toast.type}`}
          >
            {toast.title && (
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {toast.title}
              </div>
            )}
            {toast.message}
          </Alert>
        </Snackbar>
      )}
    </ToastContext.Provider>
  );
};

/**
 * ToastContextを使用するためのhook
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}; 