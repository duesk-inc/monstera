import { 
  ERROR_MESSAGES, 
  ERROR_MESSAGE_TEMPLATES, 
  getErrorCategory,
  ERROR_CATEGORY_CONFIG 
} from '../constants/errorMessages';

/**
 * APIエラーの型定義
 * バックエンドから送信されるエラーレスポンスの形式
 */
export interface ApiError {
  code?: string;
  message?: string;
  error?: string; // Go backendの標準形式
  // 共通エラーエンベロープのフィールドエラー
  errors?: Record<string, any>;
  details?: Record<string, any>;
  timestamp?: string;
  request_id?: string;
}

/**
 * 拡張されたエラー情報の型定義
 */
export interface EnhancedError {
  message: string;
  originalMessage?: string;
  code?: string;
  category?: string;
  details?: Record<string, any>;
  userMessage: string;
  technicalMessage?: string;
  showRetryButton: boolean;
  showContactSupport: boolean;
  tone: string;
}

/**
 * エラーコードからユーザーフレンドリーなメッセージを取得
 * @param errorCode エラーコード
 * @param fallbackMessage フォールバック用のメッセージ
 * @param details 動的パラメータ（オプション）
 * @returns ユーザー向けメッセージ
 */
export const getErrorMessage = (
  errorCode: string,
  fallbackMessage: string = 'エラーが発生しました。',
  details?: Record<string, any>,
): string => {
  // パラメータ付きメッセージテンプレートの確認（型ガードで安全にアクセス）
  if (
    details &&
    (errorCode as string) in ERROR_MESSAGE_TEMPLATES
  ) {
    try {
      const tmpl =
        ERROR_MESSAGE_TEMPLATES[
          errorCode as keyof typeof ERROR_MESSAGE_TEMPLATES
        ];
      return typeof tmpl === 'function' ? (tmpl as any)(details) : String(tmpl);
    } catch (error) {
      console.warn(
        `Error template execution failed for code ${errorCode}:`,
        error,
      );
    }
  }

  // 通常のメッセージマッピング（型ガードで安全にアクセス）
  if ((errorCode as string) in ERROR_MESSAGES) {
    return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] as string;
  }
  return fallbackMessage;
};

/**
 * APIエラーオブジェクトを拡張エラー情報に変換
 * @param apiError APIから返されたエラー
 * @param fallbackMessage フォールバック用のメッセージ
 * @returns 拡張されたエラー情報
 */
export const enhanceError = (
  apiError: ApiError | unknown, 
  fallbackMessage: string = 'エラーが発生しました。'
): EnhancedError => {
  // 基本的なエラー情報の抽出
  let code: string | undefined;
  let originalMessage: string = fallbackMessage;
  let details: Record<string, any> | undefined;

  if (apiError && typeof apiError === 'object') {
    const error = apiError as ApiError;
    code = error.code;
    // errors 優先で details に詰め替え（バリデーションフィールドエラーを統一）
    details = error.errors || error.details;
    
    // オリジナルメッセージの取得（優先順位: error > message）
    originalMessage = error.error || error.message || fallbackMessage;
  }

  // エラーコードがある場合はマッピングを使用
  let userMessage = originalMessage;
  if (code) {
    userMessage = getErrorMessage(code, originalMessage, details);
  }

  // カテゴリ情報の取得
  const category = code ? getErrorCategory(code) : 'SERVER';
  const categoryConfig =
    ERROR_CATEGORY_CONFIG[
      category as keyof typeof ERROR_CATEGORY_CONFIG
    ] || {
      tone: 'general',
      showRetryButton: false,
      showContactSupport: false,
    };

  return {
    message: userMessage,
    originalMessage,
    code,
    category,
    details,
    userMessage,
    technicalMessage: originalMessage !== userMessage ? originalMessage : undefined,
    showRetryButton: categoryConfig.showRetryButton,
    showContactSupport: categoryConfig.showContactSupport,
    tone: categoryConfig.tone,
  };
};

/**
 * エラーカテゴリに基づく推奨対応の取得
 * @param errorCode エラーコード
 * @returns 推奨対応情報
 */
export const getErrorActionRecommendation = (errorCode?: string) => {
  if (!errorCode) {
    return {
      primaryAction: 'retry',
      message: '再度お試しください。',
    };
  }

  const category = getErrorCategory(errorCode);
  
  switch (category) {
    case 'AUTH':
      return {
        primaryAction: 'login',
        message: 'ログインが必要です。',
      };
    
    case 'VALIDATION':
      return {
        primaryAction: 'fix-input',
        message: '入力内容を確認してください。',
      };
    
    case 'NETWORK':
      return {
        primaryAction: 'retry',
        message: '再度お試しください。',
      };
    
    case 'PERMISSION':
      return {
        primaryAction: 'contact-support',
        message: 'サポートにお問い合わせください。',
      };
    
    case 'SERVER':
      return {
        primaryAction: 'retry-later',
        message: 'しばらく時間をおいて再度お試しください。',
      };
    
    default:
      return {
        primaryAction: 'retry',
        message: '再度お試しください。',
      };
  }
};

/**
 * バリデーションエラーの詳細を取得
 * @param details エラー詳細情報
 * @returns バリデーションエラーのフィールド別情報
 */
export const getValidationErrorDetails = (details?: Record<string, any>) => {
  if (!details) return null;

  const fieldErrors: Record<string, string> = {};
  
  Object.entries(details).forEach(([field, message]) => {
    if (typeof message === 'string') {
      fieldErrors[field] = message;
    }
  });

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
};

/**
 * エラーログ出力（開発環境でのみ詳細情報を出力）
 * @param error エラーオブジェクト
 * @param context エラーが発生したコンテキスト
 */
export const logError = (error: unknown, context?: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error${context ? ` in ${context}` : ''}`);
    console.error('Error object:', error);
    
    if (error && typeof error === 'object') {
      const enhancedError = enhanceError(error as ApiError);
      console.info('Enhanced error info:', enhancedError);
    }
    
    console.groupEnd();
  }
};

/**
 * レスポンスからエラー情報を安全に抽出
 * @param response Axiosレスポンスオブジェクト
 * @returns エラー情報またはnull
 */
export const extractApiError = (response: any): ApiError | null => {
  try {
    if (response?.data) {
      const data = response.data;
      
      // 構造化されたエラーレスポンスの確認
      if (data.code || data.error || data.message) {
        return {
          code: data.code,
          message: data.message,
          error: data.error,
          // 共通エンベロープの `errors` を `details` にも反映
          errors: data.errors,
          details: data.details || data.errors,
          timestamp: data.timestamp,
          request_id: data.request_id,
        };
      }
    }
  } catch (error) {
    console.warn('Failed to extract API error:', error);
  }
  
  return null;
};

/**
 * エラーメッセージの表示制限（長すぎるメッセージの省略）
 * @param message エラーメッセージ
 * @param maxLength 最大文字数（デフォルト: 200）
 * @returns 省略されたメッセージ
 */
export const truncateErrorMessage = (message: string, maxLength: number = 200): string => {
  if (message.length <= maxLength) {
    return message;
  }
  
  return message.substring(0, maxLength - 3) + '...';
};
