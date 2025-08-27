/**
 * グローバルAPIエラーハンドラー
 * すべてのAPIエラーを統一的に処理
 */

import { AxiosError, AxiosResponse } from 'axios';
import { 
  StandardErrorResponse, 
  ApiErrorCode, 
  createErrorResponse,
  getErrorCodeFromStatus,
  getErrorMessage,
  getErrorSeverity,
  ErrorSeverity,
  isStandardErrorResponse,
  ExtendedErrorInfo,
} from '@/lib/api/types/error';
import { DebugLogger } from '@/lib/debug/logger';

/**
 * エラーハンドリングオプション
 */
export interface ErrorHandlingOptions {
  showNotification?: boolean;      // 通知を表示するか
  logError?: boolean;              // エラーをログに記録するか
  throwError?: boolean;            // エラーを再スローするか
  customHandler?: (error: StandardErrorResponse) => void; // カスタムハンドラー
  retryable?: boolean;             // リトライ可能として扱うか
  silent?: boolean;                // サイレントモード（ユーザーに通知しない）
}

/**
 * デフォルトのエラーハンドリングオプション
 */
const DEFAULT_ERROR_OPTIONS: ErrorHandlingOptions = {
  showNotification: true,
  logError: true,
  throwError: true,
  retryable: false,
  silent: false,
};

/**
 * エラー通知のタイプ
 */
type NotificationType = 'error' | 'warning' | 'info';

/**
 * グローバルエラーハンドラークラス
 */
export class GlobalApiErrorHandler {
  private static instance: GlobalApiErrorHandler;
  private errorListeners: Set<(error: StandardErrorResponse) => void> = new Set();
  private errorCount: Map<string, number> = new Map();
  private lastErrorTime: Map<string, number> = new Map();
  
  private constructor() {}
  
  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): GlobalApiErrorHandler {
    if (!GlobalApiErrorHandler.instance) {
      GlobalApiErrorHandler.instance = new GlobalApiErrorHandler();
    }
    return GlobalApiErrorHandler.instance;
  }
  
  /**
   * Axiosエラーを処理
   */
  handleAxiosError(
    error: AxiosError,
    options: ErrorHandlingOptions = {}
  ): StandardErrorResponse {
    const mergedOptions = { ...DEFAULT_ERROR_OPTIONS, ...options };
    
    // 標準エラーレスポンスに変換
    const standardError = this.convertToStandardError(error);
    
    // エラー処理の実行
    this.processError(standardError, mergedOptions);
    
    return standardError;
  }
  
  /**
   * 標準エラーレスポンスを処理
   */
  handleStandardError(
    error: StandardErrorResponse,
    options: ErrorHandlingOptions = {}
  ): void {
    const mergedOptions = { ...DEFAULT_ERROR_OPTIONS, ...options };
    this.processError(error, mergedOptions);
  }
  
  /**
   * Axiosエラーを標準エラーレスポンスに変換
   */
  private convertToStandardError(error: AxiosError): StandardErrorResponse {
    // レスポンスがある場合
    if (error.response) {
      const response = error.response as AxiosResponse;
      
      // 既に標準エラーレスポンス形式の場合
      if (isStandardErrorResponse(response.data)) {
        return response.data;
      }
      
      // HTTPステータスコードからエラーコードを取得
      const errorCode = getErrorCodeFromStatus(response.status);
      const message = this.extractErrorMessage(response) || getErrorMessage(errorCode);
      
      return createErrorResponse(
        errorCode,
        message,
        response.status,
        {
          originalError: response.data,
          url: error.config?.url,
          method: error.config?.method,
        }
      );
    }
    
    // ネットワークエラーの場合
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return createErrorResponse(
        ApiErrorCode.NETWORK_ERROR,
        'ネットワークエラーが発生しました。接続を確認してください。',
        0,
        {
          originalError: error.message,
          url: error.config?.url,
        }
      );
    }
    
    // タイムアウトの場合
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return createErrorResponse(
        ApiErrorCode.TIMEOUT,
        'リクエストがタイムアウトしました。',
        504,
        {
          timeout: error.config?.timeout,
          url: error.config?.url,
        }
      );
    }
    
    // キャンセルされた場合
    if (error.code === 'ERR_CANCELED' || 
        error.message === 'canceled' || 
        error.message === 'cancelled' ||
        (error as any).name === 'CanceledError') {
      return createErrorResponse(
        ApiErrorCode.CANCELLED,
        'リクエストがキャンセルされました。',
        0,
        {
          url: error.config?.url,
        }
      );
    }
    
    // その他のエラー（元のステータスコードを保持）
    const statusCode = error.response?.status || 0;
    const errorCode = statusCode > 0 ? getErrorCodeFromStatus(statusCode) : ApiErrorCode.UNKNOWN_ERROR;
    
    return createErrorResponse(
      errorCode,
      error.message || '予期しないエラーが発生しました。',
      statusCode || 500,  // ステータスコードがない場合のみ500を使用
      {
        originalError: error,
        url: error.config?.url,
      }
    );
  }
  
  /**
   * エラーメッセージを抽出
   */
  private extractErrorMessage(response: AxiosResponse): string | null {
    const data = response.data;
    
    // 様々な形式のエラーメッセージを抽出
    if (typeof data === 'string') {
      return data;
    }
    
    if (data && typeof data === 'object') {
      // 優先順位: message > error.message > error > errors[0].message
      return data.message ||
        data.error?.message ||
        data.error ||
        data.errors?.[0]?.message ||
        null;
    }
    
    return null;
  }
  
  /**
   * エラーを処理
   */
  private processError(
    error: StandardErrorResponse,
    options: ErrorHandlingOptions
  ): void {
    // キャンセルエラーの場合は処理をスキップ
    if (error.error.code === ApiErrorCode.CANCELLED) {
      // キャンセルはユーザーの意図的な操作なので、エラーとして扱わない
      return;
    }
    
    // エラーログの記録
    if (options.logError) {
      this.logError(error);
    }
    
    // エラー頻度のチェック
    this.trackErrorFrequency(error);
    
    // エラー通知の表示
    if (options.showNotification && !options.silent) {
      this.showErrorNotification(error);
    }
    
    // カスタムハンドラーの実行
    if (options.customHandler) {
      options.customHandler(error);
    }
    
    // リスナーへの通知
    this.notifyListeners(error);
    
    // エラーの再スロー
    if (options.throwError) {
      throw error;
    }
  }
  
  /**
   * エラーをログに記録
   */
  private logError(error: StandardErrorResponse): void {
    const severity = getErrorSeverity(error);
    const logData = {
      code: error.error.code,
      message: error.error.message,
      status: error.status,
      details: error.error.details,
      timestamp: error.timestamp,
    };
    
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        DebugLogger.apiError(
          { category: 'API', operation: 'クリティカルエラー' },
          { error: logData }
        );
        break;
      case ErrorSeverity.ERROR:
        DebugLogger.apiError(
          { category: 'API', operation: 'エラー' },
          { error: logData }
        );
        break;
      case ErrorSeverity.WARNING:
        DebugLogger.warn(
          { category: 'API', operation: '警告' },
          'APIエラー',
          logData
        );
        break;
      default:
        DebugLogger.info(
          { category: 'API', operation: '情報' },
          'APIエラー',
          logData
        );
    }
  }
  
  /**
   * エラー頻度を追跡
   */
  private trackErrorFrequency(error: StandardErrorResponse): void {
    const key = `${error.error.code}:${error.status}`;
    const now = Date.now();
    const lastTime = this.lastErrorTime.get(key) || 0;
    const count = this.errorCount.get(key) || 0;
    
    // 5分以内の同じエラーをカウント
    if (now - lastTime < 5 * 60 * 1000) {
      this.errorCount.set(key, count + 1);
      
      // 頻発エラーの警告
      if (count + 1 >= 5) {
        DebugLogger.warn(
          { category: 'API', operation: '頻発エラー検出' },
          `エラー ${key} が5分以内に${count + 1}回発生しています`,
          { error }
        );
      }
    } else {
      this.errorCount.set(key, 1);
    }
    
    this.lastErrorTime.set(key, now);
  }
  
  /**
   * エラー通知を表示
   */
  private showErrorNotification(error: StandardErrorResponse): void {
    const severity = getErrorSeverity(error);
    let type: NotificationType = 'error';
    
    switch (severity) {
      case ErrorSeverity.WARNING:
        type = 'warning';
        break;
      case ErrorSeverity.INFO:
        type = 'info';
        break;
    }
    
    // カスタムイベントを発火（UIコンポーネントでリッスン）
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('api-error-notification', {
        detail: {
          type,
          message: error.error.message,
          code: error.error.code,
          details: error.error.details,
        },
      });
      window.dispatchEvent(event);
    }
  }
  
  /**
   * エラーリスナーを追加
   */
  addErrorListener(listener: (error: StandardErrorResponse) => void): void {
    this.errorListeners.add(listener);
  }
  
  /**
   * エラーリスナーを削除
   */
  removeErrorListener(listener: (error: StandardErrorResponse) => void): void {
    this.errorListeners.delete(listener);
  }
  
  /**
   * リスナーに通知
   */
  private notifyListeners(error: StandardErrorResponse): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }
  
  /**
   * エラー統計を取得
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCode: Map<string, number>;
    recentErrors: number;
  } {
    const now = Date.now();
    let recentErrors = 0;
    
    // 過去5分のエラー数をカウント
    this.lastErrorTime.forEach((time, key) => {
      if (now - time < 5 * 60 * 1000) {
        recentErrors += this.errorCount.get(key) || 0;
      }
    });
    
    const totalErrors = Array.from(this.errorCount.values()).reduce((a, b) => a + b, 0);
    
    return {
      totalErrors,
      errorsByCode: new Map(this.errorCount),
      recentErrors,
    };
  }
  
  /**
   * エラー統計をリセット
   */
  resetErrorStats(): void {
    this.errorCount.clear();
    this.lastErrorTime.clear();
  }
}

// シングルトンインスタンスのエクスポート
export const globalApiErrorHandler = GlobalApiErrorHandler.getInstance();

/**
 * 便利な関数: Axiosエラーを処理
 */
export function handleApiError(
  error: AxiosError | StandardErrorResponse,
  options?: ErrorHandlingOptions
): StandardErrorResponse {
  if (isStandardErrorResponse(error)) {
    globalApiErrorHandler.handleStandardError(error, options);
    return error;
  }
  
  return globalApiErrorHandler.handleAxiosError(error as AxiosError, options);
}

/**
 * 便利な関数: サイレントエラー処理
 */
export function handleApiErrorSilently(
  error: AxiosError | StandardErrorResponse
): StandardErrorResponse {
  return handleApiError(error, {
    showNotification: false,
    throwError: false,
    silent: true,
  });
}

/**
 * 便利な関数: リトライ可能なエラー処理
 */
export function handleRetryableApiError(
  error: AxiosError | StandardErrorResponse,
  onRetry?: () => void
): StandardErrorResponse {
  const standardError = handleApiError(error, {
    throwError: false,
    retryable: true,
  });
  
  if (onRetry && isRetryableError(standardError)) {
    onRetry();
  }
  
  return standardError;
}

/**
 * エラーのリトライ可能性をチェック
 */
function isRetryableError(error: StandardErrorResponse): boolean {
  const retryableCodes = [
    ApiErrorCode.SERVICE_UNAVAILABLE,
    ApiErrorCode.TIMEOUT,
    ApiErrorCode.NETWORK_ERROR,
    ApiErrorCode.RATE_LIMIT_EXCEEDED,
  ];
  
  return retryableCodes.includes(error.error.code as ApiErrorCode);
}

// デフォルトエクスポート
export default globalApiErrorHandler;