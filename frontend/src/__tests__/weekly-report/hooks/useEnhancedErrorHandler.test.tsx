// useEnhancedErrorHandlerフックのテスト

import { renderHook, act } from '@testing-library/react';
import { useEnhancedErrorHandler, useSimpleErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import { handleApiError, isAbortError, AbortError } from '@/lib/api/error';
import { EnhancedError } from '@/utils/errorUtils';

// 依存関数をモック
jest.mock('@/lib/api/error', () => ({
  handleApiError: jest.fn(),
  isAbortError: jest.fn(),
  AbortError: class extends Error {
    constructor(message = 'Request was aborted') {
      super(message);
      this.name = 'AbortError';
    }
  },
}));

const mockHandleApiError = handleApiError as jest.MockedFunction<typeof handleApiError>;
const mockIsAbortError = isAbortError as jest.MockedFunction<typeof isAbortError>;

describe('useEnhancedErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトのモック設定
    mockIsAbortError.mockReturnValue(false);
    mockHandleApiError.mockReturnValue({
      message: 'デフォルトエラーメッセージ',
    });
  });

  describe('基本機能', () => {
    test('フックが正しく初期化される', () => {
      const { result } = renderHook(() => useEnhancedErrorHandler());

      expect(result.current.handleError).toBeDefined();
      expect(result.current.getToastMessage).toBeDefined();
      expect(result.current.getFieldErrors).toBeDefined();
      expect(result.current.getRecommendedAction).toBeDefined();
      expect(typeof result.current.handleError).toBe('function');
      expect(typeof result.current.getToastMessage).toBe('function');
      expect(typeof result.current.getFieldErrors).toBe('function');
      expect(typeof result.current.getRecommendedAction).toBe('function');
    });
  });

  describe('handleError', () => {
    describe('正常ケース', () => {
      test('通常のエラーを正しく処理する', () => {
        const mockError = new Error('テストエラー');
        const mockEnhanced: EnhancedError = {
          message: 'ユーザー向けメッセージ',
          userMessage: 'ユーザー向けメッセージ',
          code: 'TEST_ERROR',
          category: 'GEN',
          showRetryButton: true,
          showContactSupport: false,
          tone: 'polite',
        };

        mockHandleApiError.mockReturnValue({
          message: 'プロセスされたメッセージ',
          enhanced: mockEnhanced,
        });

        const { result } = renderHook(() => useEnhancedErrorHandler());
        
        let processedError: any;
        act(() => {
          processedError = result.current.handleError(mockError, 'テストデータ', 'テストコンテキスト');
        });

        expect(mockHandleApiError).toHaveBeenCalledWith(
          mockError,
          'テストデータ',
          { enableCodeMapping: true, logContext: 'テストコンテキスト' }
        );

        expect(processedError).toEqual({
          message: 'プロセスされたメッセージ',
          enhanced: mockEnhanced,
          isRetryable: true,
          needsSupport: false,
          category: 'GEN',
          code: 'TEST_ERROR',
        });
      });

      test('デフォルトパラメータで正しく動作する', () => {
        const mockError = new Error('テストエラー');
        mockHandleApiError.mockReturnValue({
          message: 'プロセスされたメッセージ',
        });

        const { result } = renderHook(() => useEnhancedErrorHandler());
        
        let processedError: any;
        act(() => {
          processedError = result.current.handleError(mockError);
        });

        expect(mockHandleApiError).toHaveBeenCalledWith(
          mockError,
          'データ',
          { enableCodeMapping: true, logContext: undefined }
        );

        expect(processedError).toEqual({
          message: 'プロセスされたメッセージ',
          enhanced: undefined,
          isRetryable: true,
          needsSupport: false,
          category: undefined,
          code: undefined,
        });
      });
    });

    describe('Abortエラーの処理', () => {
      test('Abortエラーの場合はnullを返す', () => {
        const mockError = new AbortError();
        mockIsAbortError.mockReturnValue(true);

        const { result } = renderHook(() => useEnhancedErrorHandler());
        
        let processedError: any;
        act(() => {
          processedError = result.current.handleError(mockError);
        });

        expect(mockIsAbortError).toHaveBeenCalledWith(mockError);
        expect(mockHandleApiError).not.toHaveBeenCalled();
        expect(processedError).toBeNull();
      });
    });

    describe('エラー情報の拡張', () => {
      test('拡張エラー情報がない場合のデフォルト値', () => {
        const mockError = new Error('テストエラー');
        mockHandleApiError.mockReturnValue({
          message: 'プロセスされたメッセージ',
        });

        const { result } = renderHook(() => useEnhancedErrorHandler());
        
        let processedError: any;
        act(() => {
          processedError = result.current.handleError(mockError);
        });

        expect(processedError.isRetryable).toBe(true);
        expect(processedError.needsSupport).toBe(false);
        expect(processedError.category).toBeUndefined();
        expect(processedError.code).toBeUndefined();
      });

      test('拡張エラー情報のフラグを正しく反映する', () => {
        const mockError = new Error('テストエラー');
        const mockEnhanced: EnhancedError = {
          message: 'ユーザー向けメッセージ',
          userMessage: 'ユーザー向けメッセージ',
          code: 'SUPPORT_REQUIRED',
          category: 'SYS',
          showRetryButton: false,
          showContactSupport: true,
          tone: 'formal',
        };

        mockHandleApiError.mockReturnValue({
          message: 'サポートが必要なエラー',
          enhanced: mockEnhanced,
        });

        const { result } = renderHook(() => useEnhancedErrorHandler());
        
        let processedError: any;
        act(() => {
          processedError = result.current.handleError(mockError);
        });

        expect(processedError.isRetryable).toBe(false);
        expect(processedError.needsSupport).toBe(true);
        expect(processedError.category).toBe('SYS');
        expect(processedError.code).toBe('SUPPORT_REQUIRED');
      });
    });
  });

  describe('getToastMessage', () => {
    test('エラーメッセージを正しく取得する', () => {
      const mockError = new Error('テストエラー');
      mockHandleApiError.mockReturnValue({
        message: 'Toast用メッセージ',
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let toastMessage: string | null;
      act(() => {
        toastMessage = result.current.getToastMessage(mockError, 'テストリソース', 'テストコンテキスト');
      });

      expect(toastMessage).toBe('Toast用メッセージ');
    });

    test('Abortエラーの場合はnullを返す', () => {
      const mockError = new AbortError();
      mockIsAbortError.mockReturnValue(true);

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let toastMessage: string | null;
      act(() => {
        toastMessage = result.current.getToastMessage(mockError);
      });

      expect(toastMessage).toBeNull();
    });

    test('エラー処理結果が空文字の場合はnullを返す', () => {
      const mockError = new Error('テストエラー');
      mockHandleApiError.mockReturnValue({
        message: '',
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let toastMessage: string | null;
      act(() => {
        toastMessage = result.current.getToastMessage(mockError);
      });

      expect(toastMessage).toBeNull();
    });

    test('エラー処理結果がundefinedの場合はnullを返す', () => {
      const mockError = new Error('テストエラー');
      mockHandleApiError.mockReturnValue({
        message: undefined,
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let toastMessage: string | null;
      act(() => {
        toastMessage = result.current.getToastMessage(mockError);
      });

      expect(toastMessage).toBeNull();
    });
  });

  describe('getFieldErrors', () => {
    test('バリデーションエラーのフィールド情報を正しく取得する', () => {
      const mockError = new Error('バリデーションエラー');
      const mockEnhanced: EnhancedError = {
        message: 'バリデーションエラーが発生しました',
        userMessage: 'バリデーションエラーが発生しました',
        category: 'VAL',
        details: {
          email: 'メールアドレスの形式が正しくありません',
          password: 'パスワードは8文字以上で入力してください',
          age: 123, // 文字列以外は除外される
        },
        showRetryButton: false,
        showContactSupport: false,
        tone: 'polite',
      };

      mockHandleApiError.mockReturnValue({
        message: 'バリデーションエラー',
        enhanced: mockEnhanced,
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let fieldErrors: Record<string, string> | null;
      act(() => {
        fieldErrors = result.current.getFieldErrors(mockError);
      });

      expect(fieldErrors).toEqual({
        email: 'メールアドレスの形式が正しくありません',
        password: 'パスワードは8文字以上で入力してください',
      });
    });

    test('バリデーション以外のエラーではnullを返す', () => {
      const mockError = new Error('一般エラー');
      const mockEnhanced: EnhancedError = {
        message: '一般エラーメッセージ',
        userMessage: '一般エラーメッセージ',
        category: 'GEN',
        details: {
          info: 'その他の情報',
        },
        showRetryButton: true,
        showContactSupport: false,
        tone: 'polite',
      };

      mockHandleApiError.mockReturnValue({
        message: '一般エラー',
        enhanced: mockEnhanced,
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let fieldErrors: Record<string, string> | null;
      act(() => {
        fieldErrors = result.current.getFieldErrors(mockError);
      });

      expect(fieldErrors).toBeNull();
    });

    test('拡張エラー情報がない場合はnullを返す', () => {
      const mockError = new Error('基本エラー');
      mockHandleApiError.mockReturnValue({
        message: '基本エラーメッセージ',
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let fieldErrors: Record<string, string> | null;
      act(() => {
        fieldErrors = result.current.getFieldErrors(mockError);
      });

      expect(fieldErrors).toBeNull();
    });

    test('フィールドエラーが空の場合はnullを返す', () => {
      const mockError = new Error('バリデーションエラー');
      const mockEnhanced: EnhancedError = {
        message: 'バリデーションエラー',
        userMessage: 'バリデーションエラー',
        category: 'VAL',
        details: {
          number: 123,
          object: { nested: 'value' },
        },
        showRetryButton: false,
        showContactSupport: false,
        tone: 'polite',
      };

      mockHandleApiError.mockReturnValue({
        message: 'バリデーションエラー',
        enhanced: mockEnhanced,
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let fieldErrors: Record<string, string> | null;
      act(() => {
        fieldErrors = result.current.getFieldErrors(mockError);
      });

      expect(fieldErrors).toBeNull();
    });
  });

  describe('getRecommendedAction', () => {
    test('拡張エラー情報がない場合のデフォルトアクション', () => {
      const mockError = new Error('基本エラー');
      mockHandleApiError.mockReturnValue({
        message: '基本エラーメッセージ',
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let action: any;
      act(() => {
        action = result.current.getRecommendedAction(mockError);
      });

      expect(action).toEqual({
        action: 'retry',
        message: '再度お試しください。',
      });
    });

    test('サポート連絡が推奨される場合', () => {
      const mockError = new Error('システムエラー');
      const mockEnhanced: EnhancedError = {
        message: 'システムエラーが発生しました',
        userMessage: 'システムエラーが発生しました',
        category: 'SYS',
        showRetryButton: false,
        showContactSupport: true,
        tone: 'formal',
      };

      mockHandleApiError.mockReturnValue({
        message: 'システムエラー',
        enhanced: mockEnhanced,
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let action: any;
      act(() => {
        action = result.current.getRecommendedAction(mockError);
      });

      expect(action).toEqual({
        action: 'contact-support',
        message: 'サポートにお問い合わせください。',
      });
    });

    test('リトライが推奨される場合', () => {
      const mockError = new Error('一時エラー');
      const mockEnhanced: EnhancedError = {
        message: '一時的なエラーです',
        userMessage: '一時的なエラーです',
        category: 'TEMP',
        showRetryButton: true,
        showContactSupport: false,
        tone: 'polite',
      };

      mockHandleApiError.mockReturnValue({
        message: '一時エラー',
        enhanced: mockEnhanced,
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let action: any;
      act(() => {
        action = result.current.getRecommendedAction(mockError);
      });

      expect(action).toEqual({
        action: 'retry',
        message: '再度お試しください。',
      });
    });

    test('認証エラーの場合', () => {
      const mockError = new Error('認証エラー');
      const mockEnhanced: EnhancedError = {
        message: '認証が必要です',
        userMessage: '認証が必要です',
        category: 'AUTH',
        showRetryButton: false,
        showContactSupport: false,
        tone: 'polite',
      };

      mockHandleApiError.mockReturnValue({
        message: '認証エラー',
        enhanced: mockEnhanced,
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let action: any;
      act(() => {
        action = result.current.getRecommendedAction(mockError);
      });

      expect(action).toEqual({
        action: 'login',
        message: 'ログインが必要です。',
      });
    });

    test('バリデーションエラーの場合', () => {
      const mockError = new Error('バリデーションエラー');
      const mockEnhanced: EnhancedError = {
        message: '入力エラーがあります',
        userMessage: '入力エラーがあります',
        category: 'VAL',
        showRetryButton: false,
        showContactSupport: false,
        tone: 'polite',
      };

      mockHandleApiError.mockReturnValue({
        message: 'バリデーションエラー',
        enhanced: mockEnhanced,
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let action: any;
      act(() => {
        action = result.current.getRecommendedAction(mockError);
      });

      expect(action).toEqual({
        action: 'fix-input',
        message: '入力内容を確認してください。',
      });
    });

    test('未知のカテゴリの場合', () => {
      const mockError = new Error('未知エラー');
      const mockEnhanced: EnhancedError = {
        message: '未知のエラーです',
        userMessage: '未知のエラーです',
        category: 'UNKNOWN',
        showRetryButton: false,
        showContactSupport: false,
        tone: 'polite',
      };

      mockHandleApiError.mockReturnValue({
        message: '未知エラー',
        enhanced: mockEnhanced,
      });

      const { result } = renderHook(() => useEnhancedErrorHandler());
      
      let action: any;
      act(() => {
        action = result.current.getRecommendedAction(mockError);
      });

      expect(action).toEqual({
        action: 'dismiss',
        message: '内容を確認してください。',
      });
    });
  });

  describe('関数の安定性', () => {
    test('フック再レンダリング後も関数参照が保持される', () => {
      const { result, rerender } = renderHook(() => useEnhancedErrorHandler());
      
      const handleErrorRef1 = result.current.handleError;
      const getToastMessageRef1 = result.current.getToastMessage;
      const getFieldErrorsRef1 = result.current.getFieldErrors;
      const getRecommendedActionRef1 = result.current.getRecommendedAction;
      
      rerender();
      
      const handleErrorRef2 = result.current.handleError;
      const getToastMessageRef2 = result.current.getToastMessage;
      const getFieldErrorsRef2 = result.current.getFieldErrors;
      const getRecommendedActionRef2 = result.current.getRecommendedAction;
      
      expect(handleErrorRef1).toBe(handleErrorRef2);
      expect(getToastMessageRef1).toBe(getToastMessageRef2);
      expect(getFieldErrorsRef1).toBe(getFieldErrorsRef2);
      expect(getRecommendedActionRef1).toBe(getRecommendedActionRef2);
    });
  });
});

describe('useSimpleErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAbortError.mockReturnValue(false);
  });

  describe('基本機能', () => {
    test('フックが正しく初期化される', () => {
      const { result } = renderHook(() => useSimpleErrorHandler());

      expect(result.current.getErrorMessage).toBeDefined();
      expect(typeof result.current.getErrorMessage).toBe('function');
    });

    test('エラーメッセージを正しく取得する', () => {
      mockHandleApiError.mockReturnValue({
        message: '取得されたエラーメッセージ',
      });

      const { result } = renderHook(() => useSimpleErrorHandler());
      
      let errorMessage: string;
      act(() => {
        errorMessage = result.current.getErrorMessage(new Error('テストエラー'), 'テストリソース');
      });

      expect(errorMessage).toBe('取得されたエラーメッセージ');
    });

    test('メッセージが取得できない場合はデフォルトメッセージを返す', () => {
      mockIsAbortError.mockReturnValue(true);

      const { result } = renderHook(() => useSimpleErrorHandler());
      
      let errorMessage: string;
      act(() => {
        errorMessage = result.current.getErrorMessage(new AbortError(), 'テストリソース');
      });

      expect(errorMessage).toBe('エラーが発生しました。');
    });

    test('デフォルトパラメータで正しく動作する', () => {
      mockHandleApiError.mockReturnValue({
        message: 'デフォルトパラメータテスト',
      });

      const { result } = renderHook(() => useSimpleErrorHandler());
      
      let errorMessage: string;
      act(() => {
        errorMessage = result.current.getErrorMessage(new Error('テストエラー'));
      });

      expect(errorMessage).toBe('デフォルトパラメータテスト');
    });
  });

  describe('関数の安定性', () => {
    test('フック再レンダリング後も関数参照が保持される', () => {
      const { result, rerender } = renderHook(() => useSimpleErrorHandler());
      
      const getErrorMessageRef1 = result.current.getErrorMessage;
      
      rerender();
      
      const getErrorMessageRef2 = result.current.getErrorMessage;
      
      expect(getErrorMessageRef1).toBe(getErrorMessageRef2);
    });
  });
});