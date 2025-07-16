// 経理機能専用のエラーハンドリングフック

import { useCallback, useRef } from "react";
import { useToast } from "../components/common/Toast/ToastProvider";
import { useEnhancedErrorHandler } from "../hooks/common/useEnhancedErrorHandler";
import {
  ACCOUNTING_ERROR_CODES,
  ERROR_MESSAGES,
} from "../constants/accounting";
import { AxiosError } from "axios";

// ========== 型定義 ==========

/**
 * 経理エラーレスポンスの型
 */
interface AccountingErrorResponse {
  error?: string;
  code?: string;
  details?: Record<string, any>;
  message?: string;
  timestamp?: string;
  request_id?: string;
  user_id?: string;
}

/**
 * エラーコンテキスト
 */
interface ErrorContext {
  operation?: string;
  resource?: string;
  resourceId?: string;
  timestamp?: Date;
  additionalInfo?: Record<string, any>;
}

/**
 * エラーログエントリ
 */
interface ErrorLogEntry {
  id: string;
  error: AccountingErrorResponse;
  context: ErrorContext;
  timestamp: Date;
  resolved: boolean;
}

// ========== カスタムフック ==========

/**
 * 経理機能専用のエラーハンドリングフック
 */
export const useAccountingErrorHandler = () => {
  const { showError, showWarning } = useToast();
  const { handleError: baseHandleError } = useEnhancedErrorHandler();
  const errorLogRef = useRef<ErrorLogEntry[]>([]);

  // エラーログの最大保持数
  const MAX_ERROR_LOG_SIZE = 50;

  /**
   * 経理エラーのハンドリング
   */
  const handleAccountingError = useCallback(
    (error: unknown, context?: ErrorContext) => {
      if (!error) return;

      const axiosError = error as AxiosError<AccountingErrorResponse>;
      const errorResponse = axiosError.response?.data;
      const errorCode = errorResponse?.code || "UNKNOWN_ERROR";

      // エラーログに記録
      const logEntry: ErrorLogEntry = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        error: errorResponse || { error: String(error) },
        context: context || {},
        timestamp: new Date(),
        resolved: false,
      };

      // ログに追加（最大サイズを維持）
      errorLogRef.current = [
        logEntry,
        ...errorLogRef.current.slice(0, MAX_ERROR_LOG_SIZE - 1),
      ];

      // エラーコードに応じた処理
      switch (errorCode) {
        // 権限エラー
        case ACCOUNTING_ERROR_CODES.PERMISSION_DENIED:
          showError(ERROR_MESSAGES.PERMISSION_DENIED);
          break;

        // データ不整合エラー
        case ACCOUNTING_ERROR_CODES.DATA_INCONSISTENCY:
          showError(
            errorResponse?.message || ERROR_MESSAGES.DATA_INCONSISTENCY,
          );
          break;

        // freee連携エラー
        case ACCOUNTING_ERROR_CODES.FREEE_AUTH_REQUIRED:
          showWarning(ERROR_MESSAGES.FREEE_AUTH_REQUIRED);
          break;

        case ACCOUNTING_ERROR_CODES.FREEE_SYNC_FAILED:
          showError(ERROR_MESSAGES.FREEE_SYNC_FAILED);
          break;

        case ACCOUNTING_ERROR_CODES.FREEE_RATE_LIMIT:
          showWarning(ERROR_MESSAGES.FREEE_RATE_LIMIT);
          break;

        // 請求処理エラー
        case ACCOUNTING_ERROR_CODES.BILLING_ALREADY_PROCESSED:
          showWarning(ERROR_MESSAGES.BILLING_ALREADY_PROCESSED);
          break;

        case ACCOUNTING_ERROR_CODES.BILLING_PREVIEW_EXPIRED:
          showWarning(ERROR_MESSAGES.BILLING_PREVIEW_EXPIRED);
          break;

        case ACCOUNTING_ERROR_CODES.BILLING_VALIDATION_FAILED:
          showError(
            errorResponse?.message || ERROR_MESSAGES.BILLING_VALIDATION_FAILED,
          );
          break;

        // プロジェクトグループエラー
        case ACCOUNTING_ERROR_CODES.PROJECT_GROUP_NOT_FOUND:
          showError(ERROR_MESSAGES.PROJECT_GROUP_NOT_FOUND);
          break;

        case ACCOUNTING_ERROR_CODES.PROJECT_GROUP_HAS_PROJECTS:
          showWarning(ERROR_MESSAGES.PROJECT_GROUP_HAS_PROJECTS);
          break;

        // スケジュールエラー
        case ACCOUNTING_ERROR_CODES.SCHEDULE_CONFLICT:
          showError(ERROR_MESSAGES.SCHEDULE_CONFLICT);
          break;

        case ACCOUNTING_ERROR_CODES.SCHEDULE_EXECUTION_FAILED:
          showError(ERROR_MESSAGES.SCHEDULE_EXECUTION_FAILED);
          break;

        // バッチ処理エラー
        case ACCOUNTING_ERROR_CODES.BATCH_JOB_FAILED:
          showError(ERROR_MESSAGES.BATCH_JOB_FAILED);
          break;

        case ACCOUNTING_ERROR_CODES.BATCH_JOB_TIMEOUT:
          showError(ERROR_MESSAGES.BATCH_JOB_TIMEOUT);
          break;

        // デフォルト処理
        default:
          const defaultMessage =
            errorResponse?.error ||
            errorResponse?.message ||
            "経理処理中にエラーが発生しました";
          showError(defaultMessage);
      }
    },
    [showError, showWarning],
  );

  /**
   * 特定の操作向けエラーハンドラー
   */
  const handleBillingError = useCallback(
    (error: unknown) => {
      handleAccountingError(error, {
        operation: "billing",
        resource: "invoice",
      });
    },
    [handleAccountingError],
  );

  const handleProjectGroupError = useCallback(
    (error: unknown, groupId?: string) => {
      handleAccountingError(error, {
        operation: "project_group",
        resource: "project_group",
        resourceId: groupId,
      });
    },
    [handleAccountingError],
  );

  const handleFreeeError = useCallback(
    (error: unknown) => {
      handleAccountingError(error, {
        operation: "freee_sync",
        resource: "freee",
      });
    },
    [handleAccountingError],
  );

  const handleScheduleError = useCallback(
    (error: unknown, scheduleId?: string) => {
      handleAccountingError(error, {
        operation: "schedule",
        resource: "scheduled_job",
        resourceId: scheduleId,
      });
    },
    [handleAccountingError],
  );

  const handleBatchError = useCallback(
    (error: unknown, jobId?: string) => {
      handleAccountingError(error, {
        operation: "batch",
        resource: "batch_job",
        resourceId: jobId,
      });
    },
    [handleAccountingError],
  );

  /**
   * フォーム送信エラーハンドラー（既存のハンドラーを拡張）
   */
  const handleAccountingSubmissionError = useCallback(
    (error: unknown, operation: string) => {
      // まず経理特有のエラーをチェック
      const axiosError = error as AxiosError<AccountingErrorResponse>;
      const errorCode = axiosError.response?.data?.code;

      if (
        errorCode &&
        Object.values(ACCOUNTING_ERROR_CODES).includes(errorCode as any)
      ) {
        handleAccountingError(error, { operation });
      } else {
        // 経理特有でない場合は汎用ハンドラーを使用
        const errorInfo = baseHandleError(error, operation);
        if (errorInfo?.message) {
          showError(errorInfo.message);
        }
      }
    },
    [handleAccountingError, baseHandleError, showError],
  );

  /**
   * エラーログの取得
   */
  const getErrorLog = useCallback(
    (options?: { resolved?: boolean; limit?: number }) => {
      let log = [...errorLogRef.current];

      if (options?.resolved !== undefined) {
        log = log.filter((entry) => entry.resolved === options.resolved);
      }

      if (options?.limit) {
        log = log.slice(0, options.limit);
      }

      return log;
    },
    [],
  );

  /**
   * エラーログのクリア
   */
  const clearErrorLog = useCallback(() => {
    errorLogRef.current = [];
  }, []);

  /**
   * エラーの解決マーク
   */
  const markErrorResolved = useCallback((errorId: string) => {
    errorLogRef.current = errorLogRef.current.map((entry) =>
      entry.id === errorId ? { ...entry, resolved: true } : entry,
    );
  }, []);

  /**
   * エラーの再試行可能性チェック
   */
  const isRetryableError = useCallback((error: unknown): boolean => {
    const axiosError = error as AxiosError<AccountingErrorResponse>;
    const errorCode = axiosError.response?.data?.code;

    const retryableErrors = [
      ACCOUNTING_ERROR_CODES.FREEE_RATE_LIMIT,
      ACCOUNTING_ERROR_CODES.BILLING_PREVIEW_EXPIRED,
      ACCOUNTING_ERROR_CODES.FREEE_SYNC_IN_PROGRESS,
    ];

    return errorCode ? retryableErrors.includes(errorCode as any) : false;
  }, []);

  /**
   * エラーから詳細情報を抽出
   */
  const extractErrorDetails = useCallback(
    (error: unknown): AccountingErrorResponse | null => {
      if (!error) return null;

      const axiosError = error as AxiosError<AccountingErrorResponse>;
      return axiosError.response?.data || null;
    },
    [],
  );

  /**
   * エラーメッセージのカスタマイズ
   */
  const getCustomErrorMessage = useCallback(
    (error: unknown, defaultMessage?: string): string => {
      const details = extractErrorDetails(error);

      if (details?.message) {
        return details.message;
      }

      if (details?.error) {
        return details.error;
      }

      if (
        details?.code &&
        ERROR_MESSAGES[details.code as keyof typeof ERROR_MESSAGES]
      ) {
        return ERROR_MESSAGES[details.code as keyof typeof ERROR_MESSAGES];
      }

      return defaultMessage || "処理中にエラーが発生しました";
    },
    [extractErrorDetails],
  );

  /**
   * バッチエラーの集約
   */
  const aggregateBatchErrors = useCallback(
    (
      errors: unknown[],
    ): { summary: string; details: AccountingErrorResponse[] } => {
      const details = errors
        .map((error) => extractErrorDetails(error))
        .filter((detail): detail is AccountingErrorResponse => detail !== null);

      const errorCounts = details.reduce(
        (acc, detail) => {
          const code = detail.code || "UNKNOWN";
          acc[code] = (acc[code] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const summary = Object.entries(errorCounts)
        .map(([code, count]) => `${code}: ${count}件`)
        .join(", ");

      return {
        summary: `バッチ処理で${errors.length}件のエラーが発生しました (${summary})`,
        details,
      };
    },
    [extractErrorDetails],
  );

  return {
    // メインハンドラー
    handleAccountingError,
    handleAccountingSubmissionError,
    handleSubmissionError: handleAccountingSubmissionError, // エイリアス

    // 特定操作向けハンドラー
    handleBillingError,
    handleProjectGroupError,
    handleFreeeError,
    handleScheduleError,
    handleBatchError,

    // エラーログ管理
    getErrorLog,
    clearErrorLog,
    markErrorResolved,

    // ユーティリティ
    isRetryableError,
    extractErrorDetails,
    getCustomErrorMessage,
    aggregateBatchErrors,
  };
};

/**
 * エラーリカバリーを管理するフック
 */
export const useAccountingErrorRecovery = () => {
  const { showSuccess, showInfo } = useToast();

  /**
   * freee認証エラーのリカバリー
   */
  const recoverFromFreeeAuthError = useCallback(() => {
    showInfo("freee連携画面に移動します");
    // 実際の実装では適切なルーティング処理を行う
    window.location.href = "/admin/accounting/freee/settings";
  }, [showInfo]);

  /**
   * 請求プレビュー期限切れのリカバリー
   */
  const recoverFromPreviewExpired = useCallback(
    (onRetry: () => void) => {
      showInfo("プレビューを再生成します");
      onRetry();
    },
    [showInfo],
  );

  /**
   * レート制限エラーのリカバリー
   */
  const recoverFromRateLimit = useCallback(
    (retryAfter: number, onRetry: () => void) => {
      showInfo(`${retryAfter}秒後に自動的に再試行します`);
      setTimeout(() => {
        onRetry();
      }, retryAfter * 1000);
    },
    [showInfo],
  );

  /**
   * データ不整合エラーのリカバリー
   */
  const recoverFromDataInconsistency = useCallback(() => {
    showInfo("データを再読み込みします");
    // キャッシュクリアと再読み込み
    window.location.reload();
  }, [showInfo]);

  return {
    recoverFromFreeeAuthError,
    recoverFromPreviewExpired,
    recoverFromRateLimit,
    recoverFromDataInconsistency,
  };
};

/**
 * エラー監視とレポーティングフック
 */
export const useAccountingErrorMonitoring = () => {
  const errorStatsRef = useRef<{
    [errorCode: string]: {
      count: number;
      lastOccurred: Date;
      contexts: ErrorContext[];
    };
  }>({});

  /**
   * エラー統計の記録
   */
  const recordError = useCallback((error: unknown, context?: ErrorContext) => {
    const axiosError = error as AxiosError<AccountingErrorResponse>;
    const errorCode = axiosError.response?.data?.code || "UNKNOWN_ERROR";

    if (!errorStatsRef.current[errorCode]) {
      errorStatsRef.current[errorCode] = {
        count: 0,
        lastOccurred: new Date(),
        contexts: [],
      };
    }

    const stats = errorStatsRef.current[errorCode];
    stats.count += 1;
    stats.lastOccurred = new Date();
    if (context) {
      stats.contexts.push(context);
      // 最新10件のコンテキストのみ保持
      stats.contexts = stats.contexts.slice(-10);
    }
  }, []);

  /**
   * エラー統計の取得
   */
  const getErrorStats = useCallback(() => {
    return Object.entries(errorStatsRef.current).map(([code, stats]) => ({
      code,
      ...stats,
    }));
  }, []);

  /**
   * 頻発エラーの検出
   */
  const getFrequentErrors = useCallback(
    (threshold: number = 5) => {
      return getErrorStats().filter((stat) => stat.count >= threshold);
    },
    [getErrorStats],
  );

  /**
   * エラー統計のリセット
   */
  const resetErrorStats = useCallback(() => {
    errorStatsRef.current = {};
  }, []);

  return {
    recordError,
    getErrorStats,
    getFrequentErrors,
    resetErrorStats,
  };
};
