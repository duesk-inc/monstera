/**
 * 統一エラーレスポンス型定義
 * すべてのAPIエラーハンドリングで使用する標準化された型
 */

/**
 * エラーコードの列挙型
 */
export enum ApiErrorCode {
  // 認証・認可エラー
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // リクエストエラー
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // リソースエラー
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  ENDPOINT_NOT_FOUND = 'ENDPOINT_NOT_FOUND',
  
  // サーバーエラー
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // レート制限
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // ビジネスロジックエラー
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  
  // ネットワークエラー
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // その他
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  CANCELLED = 'CANCELLED',
}

/**
 * エラー詳細情報
 */
export interface ErrorDetails {
  field?: string;           // エラーが発生したフィールド名
  value?: any;              // エラーの原因となった値
  constraint?: string;      // 違反した制約
  suggestion?: string;      // 修正方法の提案
  helpUrl?: string;        // ヘルプドキュメントのURL
  requestId?: string;      // リクエストID（トレーシング用）
  [key: string]: any;      // その他の詳細情報
}

/**
 * 標準エラーレスポンス型
 */
export interface StandardErrorResponse {
  error: {
    code: ApiErrorCode | string;  // エラーコード
    message: string;               // ユーザー向けメッセージ
    details?: ErrorDetails;        // 詳細情報（オプション）
  };
  status: number;                  // HTTPステータスコード
  timestamp: string;               // エラー発生時刻
}

/**
 * バリデーションエラーの詳細
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * バリデーションエラーレスポンス
 */
export interface ValidationErrorResponse extends StandardErrorResponse {
  error: {
    code: ApiErrorCode.VALIDATION_ERROR;
    message: string;
    details: {
      errors: ValidationErrorDetail[];
    };
  };
}

/**
 * エラーレベルの定義
 */
export enum ErrorSeverity {
  INFO = 'info',       // 情報レベル（処理は継続可能）
  WARNING = 'warning', // 警告レベル（処理は継続するが注意が必要）
  ERROR = 'error',     // エラーレベル（処理は失敗）
  CRITICAL = 'critical' // 重大エラー（システムレベルの問題）
}

/**
 * 拡張エラー情報
 */
export interface ExtendedErrorInfo extends StandardErrorResponse {
  severity?: ErrorSeverity;
  retryable?: boolean;           // リトライ可能かどうか
  retryAfter?: number;           // リトライまでの待機時間（秒）
  userMessage?: string;          // エンドユーザー向けメッセージ
  developerMessage?: string;     // 開発者向けメッセージ
  stackTrace?: string;           // スタックトレース（開発環境のみ）
}

/**
 * エラーマッピング設定
 */
export const ERROR_MESSAGE_MAP: Record<ApiErrorCode, string> = {
  [ApiErrorCode.UNAUTHORIZED]: '認証が必要です。ログインしてください。',
  [ApiErrorCode.FORBIDDEN]: 'アクセス権限がありません。',
  [ApiErrorCode.TOKEN_EXPIRED]: 'トークンの有効期限が切れました。再度ログインしてください。',
  [ApiErrorCode.INVALID_TOKEN]: '無効なトークンです。',
  [ApiErrorCode.SESSION_EXPIRED]: 'セッションの有効期限が切れました。',
  
  [ApiErrorCode.BAD_REQUEST]: 'リクエストが不正です。',
  [ApiErrorCode.VALIDATION_ERROR]: '入力内容に誤りがあります。',
  [ApiErrorCode.INVALID_PARAMETER]: 'パラメータが不正です。',
  [ApiErrorCode.MISSING_PARAMETER]: '必須パラメータが不足しています。',
  [ApiErrorCode.DUPLICATE_ENTRY]: '既に登録されています。',
  
  [ApiErrorCode.NOT_FOUND]: 'リソースが見つかりません。',
  [ApiErrorCode.RESOURCE_NOT_FOUND]: '指定されたリソースが見つかりません。',
  [ApiErrorCode.ENDPOINT_NOT_FOUND]: 'エンドポイントが見つかりません。',
  
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: 'サーバーエラーが発生しました。',
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 'サービスが利用できません。',
  [ApiErrorCode.DATABASE_ERROR]: 'データベースエラーが発生しました。',
  [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: '外部サービスでエラーが発生しました。',
  
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: 'リクエスト数の上限に達しました。',
  [ApiErrorCode.QUOTA_EXCEEDED]: '利用制限を超えました。',
  
  [ApiErrorCode.BUSINESS_LOGIC_ERROR]: '処理エラーが発生しました。',
  [ApiErrorCode.INSUFFICIENT_BALANCE]: '残高が不足しています。',
  [ApiErrorCode.OPERATION_NOT_ALLOWED]: 'この操作は許可されていません。',
  [ApiErrorCode.CONFLICT]: 'データの競合が発生しました。',
  
  [ApiErrorCode.NETWORK_ERROR]: 'ネットワークエラーが発生しました。',
  [ApiErrorCode.TIMEOUT]: 'タイムアウトしました。',
  [ApiErrorCode.CONNECTION_REFUSED]: '接続が拒否されました。',
  
  [ApiErrorCode.UNKNOWN_ERROR]: '予期しないエラーが発生しました。',
  [ApiErrorCode.CANCELLED]: '処理がキャンセルされました。',
};

/**
 * HTTPステータスコードからエラーコードへのマッピング
 */
export const STATUS_TO_ERROR_CODE: Record<number, ApiErrorCode> = {
  400: ApiErrorCode.BAD_REQUEST,
  401: ApiErrorCode.UNAUTHORIZED,
  403: ApiErrorCode.FORBIDDEN,
  404: ApiErrorCode.NOT_FOUND,
  409: ApiErrorCode.CONFLICT,
  422: ApiErrorCode.VALIDATION_ERROR,
  429: ApiErrorCode.RATE_LIMIT_EXCEEDED,
  500: ApiErrorCode.INTERNAL_SERVER_ERROR,
  502: ApiErrorCode.EXTERNAL_SERVICE_ERROR,
  503: ApiErrorCode.SERVICE_UNAVAILABLE,
  504: ApiErrorCode.TIMEOUT,
};

/**
 * エラーの再試行可能性を判定
 */
export function isRetryableError(error: StandardErrorResponse): boolean {
  const retryableCodes = [
    ApiErrorCode.SERVICE_UNAVAILABLE,
    ApiErrorCode.TIMEOUT,
    ApiErrorCode.NETWORK_ERROR,
    ApiErrorCode.RATE_LIMIT_EXCEEDED,
    ApiErrorCode.EXTERNAL_SERVICE_ERROR,
  ];
  
  return retryableCodes.includes(error.error.code as ApiErrorCode);
}

/**
 * エラーコードからメッセージを取得
 */
export function getErrorMessage(code: ApiErrorCode | string): string {
  if (code in ERROR_MESSAGE_MAP) {
    return ERROR_MESSAGE_MAP[code as ApiErrorCode];
  }
  return ERROR_MESSAGE_MAP[ApiErrorCode.UNKNOWN_ERROR];
}

/**
 * HTTPステータスコードからエラーコードを取得
 */
export function getErrorCodeFromStatus(status: number): ApiErrorCode {
  return STATUS_TO_ERROR_CODE[status] || ApiErrorCode.UNKNOWN_ERROR;
}

/**
 * エラーレスポンスの作成
 */
export function createErrorResponse(
  code: ApiErrorCode | string,
  message?: string,
  status?: number,
  details?: ErrorDetails
): StandardErrorResponse {
  return {
    error: {
      code,
      message: message || getErrorMessage(code),
      details,
    },
    status: status || 500,
    timestamp: new Date().toISOString(),
  };
}

/**
 * バリデーションエラーレスポンスの作成
 */
export function createValidationErrorResponse(
  errors: ValidationErrorDetail[],
  message?: string
): ValidationErrorResponse {
  return {
    error: {
      code: ApiErrorCode.VALIDATION_ERROR,
      message: message || '入力内容に誤りがあります。',
      details: {
        errors,
      },
    },
    status: 422,
    timestamp: new Date().toISOString(),
  };
}

/**
 * エラーの重要度を判定
 */
export function getErrorSeverity(error: StandardErrorResponse): ErrorSeverity {
  const { status } = error;
  
  if (status >= 500) {
    return ErrorSeverity.CRITICAL;
  } else if (status >= 400 && status < 500) {
    return ErrorSeverity.ERROR;
  } else if (status >= 300 && status < 400) {
    return ErrorSeverity.WARNING;
  }
  
  return ErrorSeverity.INFO;
}

/**
 * エラーレスポンスの型ガード
 */
export function isStandardErrorResponse(response: any): response is StandardErrorResponse {
  return response &&
    typeof response === 'object' &&
    'error' in response &&
    typeof response.error === 'object' &&
    'code' in response.error &&
    'message' in response.error &&
    'status' in response &&
    'timestamp' in response;
}

/**
 * バリデーションエラーの型ガード
 */
export function isValidationErrorResponse(response: any): response is ValidationErrorResponse {
  return (
    isStandardErrorResponse(response) &&
    response.error.code === ApiErrorCode.VALIDATION_ERROR &&
    !!response.error.details &&
    Array.isArray(response.error.details.errors)
  );
}
