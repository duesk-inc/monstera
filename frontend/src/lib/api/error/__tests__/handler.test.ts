/**
 * グローバルエラーハンドラーのユニットテスト
 */

import { AxiosError } from 'axios';
import {
  GlobalApiErrorHandler,
  globalApiErrorHandler,
  convertToStandardError,
  handleApiError,
  isApiError,
  getErrorMessage,
  getErrorCode,
  isNetworkError,
  isAuthenticationError,
  isValidationError,
  isServerError,
  ApiErrorCode,
  StandardErrorResponse,
  ErrorHandlerConfig,
} from '../handler';

// モック設定
const mockDispatchEvent = jest.fn();
const originalDispatchEvent = window.dispatchEvent;

beforeEach(() => {
  jest.clearAllMocks();
  window.dispatchEvent = mockDispatchEvent;
  // エラーハンドラーの状態をリセット
  (globalApiErrorHandler as any).errorTracking.clear();
  (globalApiErrorHandler as any).errorListeners.clear();
});

afterEach(() => {
  window.dispatchEvent = originalDispatchEvent;
});

describe('GlobalApiErrorHandler', () => {
  describe('シングルトンパターン', () => {
    it('同じインスタンスを返す', () => {
      const instance1 = GlobalApiErrorHandler.getInstance();
      const instance2 = GlobalApiErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('グローバルインスタンスが正しく設定されている', () => {
      expect(globalApiErrorHandler).toBe(GlobalApiErrorHandler.getInstance());
    });
  });

  describe('handleError', () => {
    it('AxiosErrorを正しく処理する', () => {
      const axiosError: AxiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
            },
          },
          headers: {},
          config: {} as any,
        },
        config: {} as any,
        message: 'Request failed',
        name: 'AxiosError',
        toJSON: () => ({}),
      };

      const result = globalApiErrorHandler.handleError(axiosError);
      
      expect(result.status).toBe(400);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Invalid input');
    });

    it('ネットワークエラーを処理する', () => {
      const networkError: AxiosError = {
        isAxiosError: true,
        message: 'Network Error',
        name: 'AxiosError',
        config: {} as any,
        toJSON: () => ({}),
      };

      const result = globalApiErrorHandler.handleError(networkError);
      
      expect(result.status).toBe(0);
      expect(result.error.code).toBe(ApiErrorCode.NETWORK_ERROR);
      expect(result.error.message).toContain('ネットワークエラー');
    });

    it('タイムアウトエラーを処理する', () => {
      const timeoutError: AxiosError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
        name: 'AxiosError',
        config: {} as any,
        toJSON: () => ({}),
      };

      const result = globalApiErrorHandler.handleError(timeoutError);
      
      expect(result.status).toBe(408);
      expect(result.error.code).toBe(ApiErrorCode.TIMEOUT_ERROR);
    });

    it('通常のErrorオブジェクトを処理する', () => {
      const error = new Error('Something went wrong');
      const result = globalApiErrorHandler.handleError(error);
      
      expect(result.status).toBe(500);
      expect(result.error.code).toBe(ApiErrorCode.UNKNOWN_ERROR);
      expect(result.error.message).toBe('Something went wrong');
    });

    it('文字列エラーを処理する', () => {
      const result = globalApiErrorHandler.handleError('Error message');
      
      expect(result.status).toBe(500);
      expect(result.error.code).toBe(ApiErrorCode.UNKNOWN_ERROR);
      expect(result.error.message).toBe('Error message');
    });

    it('UI通知を送信する', () => {
      const error: AxiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config: {} as any,
        },
        config: {} as any,
        message: 'Unauthorized',
        name: 'AxiosError',
        toJSON: () => ({}),
      };

      globalApiErrorHandler.handleError(error, { notifyUI: true });
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'api-error',
          detail: expect.objectContaining({
            error: expect.objectContaining({
              status: 401,
            }),
          }),
        })
      );
    });
  });

  describe('エラー追跡', () => {
    it('エラーを追跡する', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      globalApiErrorHandler.handleError(error1);
      globalApiErrorHandler.handleError(error2);
      
      const tracking = globalApiErrorHandler.getErrorTracking();
      expect(tracking.size).toBe(2);
    });

    it('同じエラーコードの頻度を追跡する', () => {
      const error: AxiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            error: {
              code: 'VALIDATION_ERROR',
            },
          },
          headers: {},
          config: {} as any,
        },
        config: {} as any,
        message: 'Validation failed',
        name: 'AxiosError',
        toJSON: () => ({}),
      };

      globalApiErrorHandler.handleError(error);
      globalApiErrorHandler.handleError(error);
      
      const tracking = globalApiErrorHandler.getErrorTracking();
      const validationErrors = tracking.get('VALIDATION_ERROR');
      expect(validationErrors?.count).toBe(2);
    });

    it('エラー追跡をクリアできる', () => {
      const error = new Error('Test error');
      globalApiErrorHandler.handleError(error);
      
      expect(globalApiErrorHandler.getErrorTracking().size).toBe(1);
      
      globalApiErrorHandler.clearErrorTracking();
      expect(globalApiErrorHandler.getErrorTracking().size).toBe(0);
    });
  });

  describe('エラーリスナー', () => {
    it('エラーリスナーを登録できる', () => {
      const listener = jest.fn();
      const unsubscribe = globalApiErrorHandler.addErrorListener(listener);
      
      const error = new Error('Test error');
      globalApiErrorHandler.handleError(error);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ApiErrorCode.UNKNOWN_ERROR,
          }),
        })
      );
      
      unsubscribe();
    });

    it('複数のリスナーを登録できる', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      globalApiErrorHandler.addErrorListener(listener1);
      globalApiErrorHandler.addErrorListener(listener2);
      
      const error = new Error('Test error');
      globalApiErrorHandler.handleError(error);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('リスナーを削除できる', () => {
      const listener = jest.fn();
      const unsubscribe = globalApiErrorHandler.addErrorListener(listener);
      
      unsubscribe();
      
      const error = new Error('Test error');
      globalApiErrorHandler.handleError(error);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('設定管理', () => {
    it('設定を更新できる', () => {
      const newConfig: ErrorHandlerConfig = {
        enableLogging: false,
        enableTracking: false,
        notifyUI: false,
        maxTrackingSize: 50,
      };
      
      globalApiErrorHandler.updateConfig(newConfig);
      const config = globalApiErrorHandler.getConfig();
      
      expect(config.enableLogging).toBe(false);
      expect(config.enableTracking).toBe(false);
      expect(config.notifyUI).toBe(false);
      expect(config.maxTrackingSize).toBe(50);
    });
  });
});

describe('ヘルパー関数', () => {
  describe('convertToStandardError', () => {
    it('AxiosErrorを標準エラーに変換する', () => {
      const axiosError: AxiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied',
            },
          },
          headers: {},
          config: {} as any,
        },
        config: {} as any,
        message: 'Forbidden',
        name: 'AxiosError',
        toJSON: () => ({}),
      };

      const result = convertToStandardError(axiosError);
      
      expect(result.status).toBe(403);
      expect(result.error.code).toBe('FORBIDDEN');
      expect(result.error.message).toBe('Access denied');
    });

    it('標準エラーレスポンスをそのまま返す', () => {
      const standardError: StandardErrorResponse = {
        error: {
          code: 'TEST_ERROR',
          message: 'Test message',
        },
        status: 400,
        timestamp: new Date().toISOString(),
      };

      const result = convertToStandardError(standardError);
      expect(result).toBe(standardError);
    });
  });

  describe('isApiError', () => {
    it('AxiosErrorを正しく判定する', () => {
      const axiosError: AxiosError = {
        isAxiosError: true,
        config: {} as any,
        message: 'Error',
        name: 'AxiosError',
        toJSON: () => ({}),
      };

      expect(isApiError(axiosError)).toBe(true);
    });

    it('通常のエラーをfalseと判定する', () => {
      const error = new Error('Normal error');
      expect(isApiError(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('エラーメッセージを取得する', () => {
      const error: StandardErrorResponse = {
        error: {
          code: 'ERROR_CODE',
          message: 'Error message',
        },
        status: 400,
        timestamp: new Date().toISOString(),
      };

      expect(getErrorMessage(error)).toBe('Error message');
    });

    it('AxiosErrorからメッセージを取得する', () => {
      const axiosError: AxiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            error: {
              message: 'Validation failed',
            },
          },
          headers: {},
          config: {} as any,
        },
        config: {} as any,
        message: 'Request failed',
        name: 'AxiosError',
        toJSON: () => ({}),
      };

      expect(getErrorMessage(axiosError)).toBe('Validation failed');
    });
  });

  describe('getErrorCode', () => {
    it('エラーコードを取得する', () => {
      const error: StandardErrorResponse = {
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Error',
        },
        status: 400,
        timestamp: new Date().toISOString(),
      };

      expect(getErrorCode(error)).toBe('CUSTOM_ERROR');
    });
  });

  describe('エラータイプ判定関数', () => {
    it('ネットワークエラーを判定する', () => {
      const networkError: AxiosError = {
        isAxiosError: true,
        message: 'Network Error',
        name: 'AxiosError',
        config: {} as any,
        toJSON: () => ({}),
      };

      expect(isNetworkError(networkError)).toBe(true);
    });

    it('認証エラーを判定する', () => {
      const authError: StandardErrorResponse = {
        error: {
          code: ApiErrorCode.UNAUTHORIZED,
          message: 'Unauthorized',
        },
        status: 401,
        timestamp: new Date().toISOString(),
      };

      expect(isAuthenticationError(authError)).toBe(true);
    });

    it('検証エラーを判定する', () => {
      const validationError: StandardErrorResponse = {
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
        },
        status: 400,
        timestamp: new Date().toISOString(),
      };

      expect(isValidationError(validationError)).toBe(true);
    });

    it('サーバーエラーを判定する', () => {
      const serverError: StandardErrorResponse = {
        error: {
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        },
        status: 500,
        timestamp: new Date().toISOString(),
      };

      expect(isServerError(serverError)).toBe(true);
    });
  });

  describe('handleApiError', () => {
    it('エラーを処理してStandardErrorResponseを返す', () => {
      const error = new Error('Test error');
      const result = handleApiError(error);
      
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
    });

    it('オプションを渡せる', () => {
      const error = new Error('Test error');
      handleApiError(error, { notifyUI: true });
      
      expect(mockDispatchEvent).toHaveBeenCalled();
    });
  });
});