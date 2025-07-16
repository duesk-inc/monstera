import { useCallback } from 'react';
import { handleApiError, isAbortError } from '../../lib/api/error';
import { type EnhancedError } from '../../utils/errorUtils';

/**
 * 拡張されたエラーハンドリングフック
 * エラーコード変換とユーザビリティを考慮したエラー処理を提供
 */
export const useEnhancedErrorHandler = () => {
  /**
   * APIエラーを処理し、ユーザーフレンドリーなメッセージとアクション情報を返す
   * @param error エラーオブジェクト
   * @param resourceName リソース名
   * @param context 処理コンテキスト（ログ用）
   * @returns 処理されたエラー情報
   */
  const handleError = useCallback((
    error: unknown, 
    resourceName: string = 'データ',
    context?: string
  ) => {
    // Abortエラーは通常表示しない
    if (isAbortError(error)) {
      return null;
    }

    const processedError = handleApiError(error, resourceName, { 
      enableCodeMapping: true,
      logContext: context 
    });

    // 拡張エラー情報がある場合は詳細情報も返す
    const enhanced = (processedError as any).enhanced as EnhancedError | undefined;

    return {
      message: processedError.message,
      enhanced,
      isRetryable: enhanced?.showRetryButton ?? true,
      needsSupport: enhanced?.showContactSupport ?? false,
      category: enhanced?.category,
      code: enhanced?.code,
    };
  }, []);

  /**
   * エラーを処理してToast表示用のメッセージを取得
   * @param error エラーオブジェクト
   * @param resourceName リソース名
   * @param context 処理コンテキスト
   * @returns Toast表示用のメッセージ（nullの場合は表示しない）
   */
  const getToastMessage = useCallback((
    error: unknown,
    resourceName: string = 'データ',
    context?: string
  ): string | null => {
    const result = handleError(error, resourceName, context);
    return result?.message || null;
  }, [handleError]);

  /**
   * バリデーションエラーのフィールド別エラーを取得
   * @param error エラーオブジェクト
   * @returns フィールド別エラー情報
   */
  const getFieldErrors = useCallback((error: unknown): Record<string, string> | null => {
    const result = handleError(error);
    
    if (result?.enhanced?.details && result.enhanced.category === 'VAL') {
      const fieldErrors: Record<string, string> = {};
      
      Object.entries(result.enhanced.details).forEach(([field, message]) => {
        if (typeof message === 'string') {
          fieldErrors[field] = message;
        }
      });
      
      return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
    }
    
    return null;
  }, [handleError]);

  /**
   * エラーに基づく推奨アクションを取得
   * @param error エラーオブジェクト
   * @returns 推奨アクション情報
   */
  const getRecommendedAction = useCallback((error: unknown) => {
    const result = handleError(error);
    
    if (!result?.enhanced) {
      return { action: 'retry', message: '再度お試しください。' };
    }

    const { category, showRetryButton, showContactSupport } = result.enhanced;
    
    if (showContactSupport) {
      return { action: 'contact-support', message: 'サポートにお問い合わせください。' };
    }
    
    if (showRetryButton) {
      return { action: 'retry', message: '再度お試しください。' };
    }
    
    switch (category) {
      case 'AUTH':
        return { action: 'login', message: 'ログインが必要です。' };
      case 'VAL':
        return { action: 'fix-input', message: '入力内容を確認してください。' };
      default:
        return { action: 'dismiss', message: '内容を確認してください。' };
    }
  }, [handleError]);

  return {
    handleError,
    getToastMessage,
    getFieldErrors,
    getRecommendedAction,
  };
};

/**
 * シンプルなエラーハンドリングフック（従来のインターフェース互換）
 * 既存コードからの移行を容易にするため
 */
export const useSimpleErrorHandler = () => {
  const { getToastMessage } = useEnhancedErrorHandler();
  
  /**
   * エラーメッセージを取得する簡易関数
   * @param error エラーオブジェクト
   * @param resourceName リソース名
   * @returns エラーメッセージ
   */
  const getErrorMessage = useCallback((
    error: unknown, 
    resourceName: string = 'データ'
  ): string => {
    return getToastMessage(error, resourceName) || 'エラーが発生しました。';
  }, [getToastMessage]);

  return { getErrorMessage };
};