/**
 * フロントエンド用デバッグログ機能
 * 開発環境でのみ動作し、本番環境では何も出力しない
 */

export interface DebugLogConfig {
  /** ログのカテゴリ（API、UI、Validationなど） */
  category: string;
  /** 操作名（create、update、deleteなど） */
  operation: string;
  /** 詳細な説明（任意） */
  description?: string;
}

export interface ApiDebugLogData {
  /** リクエストURL */
  url?: string;
  /** HTTPメソッド */
  method?: string;
  /** リクエストデータ（送信前） */
  requestData?: unknown;
  /** 変換後のリクエストデータ */
  convertedRequestData?: unknown;
  /** レスポンスステータス */
  status?: number;
  /** レスポンスデータ（生データ） */
  responseData?: unknown;
  /** 変換後のレスポンスデータ */
  convertedResponseData?: unknown;
  /** エラー情報 */
  error?: unknown;
  /** 追加のメタデータ */
  metadata?: Record<string, unknown>;
}

export class DebugLogger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * API操作の開始ログを出力
   */
  static apiStart(config: DebugLogConfig, data: Partial<ApiDebugLogData> = {}) {
    if (!this.isDevelopment) return;

    console.log(`=== ${config.category} ${config.operation} API 開始 ===`);
    if (config.description) {
      console.log(`説明: ${config.description}`);
    }
    if (data.url) {
      console.log(`URL: ${data.url}`);
    }
    if (data.method) {
      console.log(`メソッド: ${data.method}`);
    }
    if (data.requestData !== undefined) {
      console.log('送信データ(変換前):', data.requestData);
      console.log('送信データ JSON:', JSON.stringify(data.requestData, null, 2));
    }
    if (data.convertedRequestData !== undefined) {
      console.log('送信データ(変換後):', data.convertedRequestData);
      console.log('送信データ(変換後) JSON:', JSON.stringify(data.convertedRequestData, null, 2));
    }
    if (data.metadata) {
      console.log('メタデータ:', data.metadata);
    }
    console.log(`=== ${config.category} ${config.operation} API 送信データ確認終了 ===`);
  }

  /**
   * API操作の成功ログを出力
   */
  static apiSuccess(config: DebugLogConfig, data: Partial<ApiDebugLogData> = {}) {
    if (!this.isDevelopment) return;

    console.log(`=== ${config.category} ${config.operation} API 成功 ===`);
    if (data.status) {
      console.log(`ステータス: ${data.status}`);
    }
    if (data.responseData !== undefined) {
      console.log('レスポンスデータ(生データ):', data.responseData);
      console.log('レスポンスデータ JSON:', JSON.stringify(data.responseData, null, 2));
    }
    if (data.convertedResponseData !== undefined) {
      console.log('レスポンスデータ(変換後):', data.convertedResponseData);
      console.log('レスポンスデータ(変換後) JSON:', JSON.stringify(data.convertedResponseData, null, 2));
    }
    if (data.metadata) {
      console.log('メタデータ:', data.metadata);
    }
    console.log(`=== ${config.category} ${config.operation} API 成功終了 ===`);
  }

  /**
   * API操作のエラーログを出力
   */
  static apiError(config: DebugLogConfig, data: Partial<ApiDebugLogData> = {}) {
    if (!this.isDevelopment) return;

    console.log(`=== ${config.category} ${config.operation} API エラー ===`);
    if (data.error) {
      console.log('エラー:', data.error);
      
      // Axiosエラーの詳細情報を出力
      if (typeof data.error === 'object' && data.error !== null && 'isAxiosError' in data.error) {
        const axiosError = data.error as {
          isAxiosError: boolean;
          response?: {
            data?: unknown;
            status?: number;
            headers?: unknown;
          };
          config?: {
            data?: unknown;
          };
        };
        
        console.log('エラーレスポンス:', axiosError.response?.data);
        console.log('エラーステータス:', axiosError.response?.status);
        console.log('エラーヘッダー:', axiosError.response?.headers);
        console.log('リクエスト設定:', axiosError.config);
        console.log('リクエストデータ:', axiosError.config?.data);
      }
    }
    if (data.metadata) {
      console.log('メタデータ:', data.metadata);
    }
    console.log(`=== ${config.category} ${config.operation} API エラー終了 ===`);
  }

  /**
   * 汎用的なデバッグログを出力
   */
  static debug(config: DebugLogConfig, message: string, data?: unknown) {
    if (!this.isDevelopment) return;

    console.log(`[${config.category}] ${config.operation}: ${message}`);
    if (data !== undefined) {
      console.log('データ:', data);
    }
  }

  /**
   * データ変換のログを出力
   */
  static dataConversion(config: DebugLogConfig, beforeData: unknown, afterData: unknown, conversionType: string) {
    if (!this.isDevelopment) return;

    console.log(`=== ${config.category} ${config.operation} データ変換 (${conversionType}) ===`);
    console.log('変換前:', beforeData);
    console.log('変換後:', afterData);
    console.log(`=== データ変換終了 ===`);
  }

  /**
   * バリデーションのログを出力
   */
  static validation(config: DebugLogConfig, isValid: boolean, errors?: unknown, data?: unknown) {
    if (!this.isDevelopment) return;

    console.log(`=== ${config.category} ${config.operation} バリデーション ===`);
    console.log('バリデーション結果:', isValid ? '成功' : '失敗');
    if (!isValid && errors) {
      console.log('エラー:', errors);
    }
    if (data !== undefined) {
      console.log('検証データ:', data);
    }
    console.log(`=== バリデーション終了 ===`);
  }

  /**
   * 情報ログを出力
   */
  static info(config: DebugLogConfig, message: string, data?: unknown) {
    if (!this.isDevelopment) return;

    console.log(`[情報][${config.category}] ${config.operation}: ${message}`);
    if (data !== undefined) {
      console.log('データ:', data);
    }
  }

  /**
   * APIリクエストのログを出力
   */
  static apiRequest(config: DebugLogConfig, data: ApiDebugLogData) {
    if (!this.isDevelopment) return;

    console.log(`=== ${config.category} ${config.operation} API 送信 ===`);
    if (config.description) {
      console.log(`説明: ${config.description}`);
    }
    if (data.url) {
      console.log(`URL: ${data.url}`);
    }
    if (data.method) {
      console.log(`メソッド: ${data.method}`);
    }
    if (data.requestData !== undefined) {
      console.log('送信データ(変換前):', data.requestData);
      console.log('送信データ JSON:', JSON.stringify(data.requestData, null, 2));
    }
    if (data.convertedRequestData !== undefined) {
      console.log('送信データ(変換後):', data.convertedRequestData);
      console.log('送信データ(変換後) JSON:', JSON.stringify(data.convertedRequestData, null, 2));
    }
    if (data.metadata) {
      console.log('メタデータ:', data.metadata);
    }
    console.log(`=== ${config.category} ${config.operation} API 送信データ確認終了 ===`);
  }

  /**
   * 処理時間を測定するためのタイマー機能
   */
  static time(label: string) {
    if (!this.isDevelopment) return;
    console.time(label);
  }

  static timeEnd(label: string) {
    if (!this.isDevelopment) return;
    console.timeEnd(label);
  }
}

/**
 * よく使用されるカテゴリの定数
 */
export const DEBUG_CATEGORIES = {
  API: 'API',
  UI: 'UI',
  VALIDATION: 'Validation',
  DATA_CONVERSION: 'DataConversion',
  AUTHENTICATION: 'Authentication',
  ROUTING: 'Routing',
  STATE_MANAGEMENT: 'StateManagement',
} as const;

/**
 * よく使用される操作の定数
 */
export const DEBUG_OPERATIONS = {
  CREATE: 'Create',
  READ: 'Read',
  UPDATE: 'Update',
  DELETE: 'Delete',
  LIST: 'List',
  SUBMIT: 'Submit',
  VALIDATE: 'Validate',
  CONVERT: 'Convert',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  NAVIGATE: 'Navigate',
} as const;

/**
 * 使用例:
 * 
 * // API呼び出しの場合
 * DebugLogger.apiStart(
 *   { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.CREATE, description: '週報作成' },
 *   { url: '/api/v1/weekly-reports', method: 'POST', requestData: weeklyReport }
 * );
 * 
 * // データ変換の場合
 * DebugLogger.dataConversion(
 *   { category: DEBUG_CATEGORIES.DATA_CONVERSION, operation: DEBUG_OPERATIONS.CONVERT },
 *   camelCaseData,
 *   snakeCaseData,
 *   'CamelToSnake'
 * );
 * 
 * // バリデーションの場合
 * DebugLogger.validation(
 *   { category: DEBUG_CATEGORIES.VALIDATION, operation: DEBUG_OPERATIONS.VALIDATE },
 *   isValid,
 *   errors,
 *   formData
 * );
 */ 