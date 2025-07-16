import { useCallback } from 'react';
import { handleApiError, isAbortError } from '@/lib/api/error';
import { useToast } from '@/components/common';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  severity?: ErrorSeverity;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
}

export interface UseErrorHandlerReturn {
  handleError: (error: unknown, context?: string, options?: ErrorHandlerOptions) => void;
  handleApiError: (error: unknown, resourceName: string, options?: ErrorHandlerOptions) => void;
  handleValidationError: (error: unknown, formName: string, options?: ErrorHandlerOptions) => void;
  handleSubmissionError: (error: unknown, actionName: string, options?: ErrorHandlerOptions) => void;
}

/**
 * 統一エラーハンドリングフック
 * 全てのエラー処理を標準化し、適切なユーザーフィードバックを提供
 */
export const useErrorHandler = (): UseErrorHandlerReturn => {
  const { showError, showWarning, showInfo } = useToast();
  
  // 基本のエラーハンドラー
  const handleError = useCallback((
    error: unknown, 
    context: string = '操作',
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      severity = 'error',
      fallbackMessage = `${context}中にエラーが発生しました`,
      onError
    } = options;

    // Abortエラーの場合は通常ログに出さない
    if (isAbortError(error)) {
      if (logError && process.env.NODE_ENV === 'development') {
        console.info(`${context}: リクエストがキャンセルされました`, error);
      }
      return;
    }

    // エラーメッセージの決定
    let message: string;
    if (error instanceof Error) {
      message = error.message || fallbackMessage;
    } else if (typeof error === 'string') {
      message = error;
    } else {
      message = fallbackMessage;
    }

    // ログ出力
    if (logError) {
      const logMethod = severity === 'error' ? console.error : 
                       severity === 'warning' ? console.warn : 
                       console.info;
      logMethod(`[${context}] ${message}`, error);
    }

    // トースト通知
    if (showToast) {
      switch (severity) {
        case 'warning':
          showWarning(message, { title: context });
          break;
        case 'info':
          showInfo(message, { title: context });
          break;
        case 'error':
        default:
          showError(message, { title: context });
          break;
      }
    }

    // カスタムエラーハンドラーの実行
    if (onError) {
      onError(error instanceof Error ? error : new Error(message));
    }
  }, [showError, showWarning, showInfo]);

  // APIエラー専用ハンドラー
  const handleApiErrorWrapper = useCallback((
    error: unknown,
    resourceName: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const processedError = handleApiError(error, resourceName);
    handleError(processedError, `API: ${resourceName}`, {
      fallbackMessage: `${resourceName}の処理に失敗しました`,
      ...options
    });
  }, [handleError]);

  // バリデーションエラー専用ハンドラー
  const handleValidationError = useCallback((
    error: unknown,
    formName: string,
    options: ErrorHandlerOptions = {}
  ) => {
    handleError(error, `フォーム検証: ${formName}`, {
      severity: 'warning',
      fallbackMessage: `${formName}の入力内容に問題があります`,
      ...options
    });
  }, [handleError]);

  // 送信エラー専用ハンドラー
  const handleSubmissionError = useCallback((
    error: unknown,
    actionName: string,
    options: ErrorHandlerOptions = {}
  ) => {
    handleError(error, `送信処理: ${actionName}`, {
      fallbackMessage: `${actionName}の送信に失敗しました。時間をおいて再度お試しください`,
      ...options
    });
  }, [handleError]);

  return {
    handleError,
    handleApiError: handleApiErrorWrapper,
    handleValidationError,
    handleSubmissionError,
  };
};