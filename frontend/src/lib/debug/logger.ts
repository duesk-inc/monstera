/**
 * フロントエンド用デバッグログ機能
 * 開発環境でのみ動作し、本番環境では何も出力しない
 */

/**
 * ログレベル定義
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

/**
 * ログレベル設定クラス
 */
export class LogConfig {
  private static minLevel: LogLevel = LogLevel.DEBUG;
  
  /**
   * 最小ログレベルを設定
   */
  static setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
  
  /**
   * 現在の最小ログレベルを取得
   */
  static getLevel(): LogLevel {
    return this.minLevel;
  }
  
  /**
   * 指定されたレベルがログ出力対象かどうかを判定
   */
  static shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }
}

/**
 * ログフォーマッターインターフェース
 */
export interface LogFormatter {
  format(level: LogLevel, config: DebugLogConfig, message: string, data?: any): string;
}

/**
 * コンソール用フォーマッター
 */
export class ConsoleFormatter implements LogFormatter {
  format(level: LogLevel, config: DebugLogConfig, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const category = config.category;
    const operation = config.operation || '';
    
    let formatted = `[${timestamp}][${levelStr}][${category}]`;
    if (operation) {
      formatted += ` ${operation}:`;
    }
    formatted += ` ${message}`;
    
    if (data !== undefined) {
      formatted += '\n' + JSON.stringify(data, null, 2);
    }
    
    return formatted;
  }
}

/**
 * JSON用フォーマッター
 */
export class JSONFormatter implements LogFormatter {
  format(level: LogLevel, config: DebugLogConfig, message: string, data?: any): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      category: config.category,
      operation: config.operation,
      message,
      data
    }, null, 2);
  }
}

/**
 * シンプルフォーマッター（既存形式との互換性用）
 */
export class SimpleFormatter implements LogFormatter {
  format(level: LogLevel, config: DebugLogConfig, message: string, data?: any): string {
    const levelPrefix = `[${LogLevel[level]}]`;
    const categoryPrefix = `[${config.category}]`;
    const operationPrefix = config.operation ? ` ${config.operation}:` : ':';
    
    let formatted = `${levelPrefix}${categoryPrefix}${operationPrefix} ${message}`;
    
    if (data !== undefined) {
      formatted += '\nデータ: ' + JSON.stringify(data, null, 2);
    }
    
    return formatted;
  }
}

/**
 * ログ出力先インターフェース
 */
export interface LogOutput {
  write(message: string, level: LogLevel): void;
  flush?(): void;
}

/**
 * コンソール出力
 */
export class ConsoleOutput implements LogOutput {
  write(message: string, level: LogLevel): void {
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.log(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message);
        break;
      default:
        console.log(message);
    }
  }
}

/**
 * バッファリング出力
 */
export class BufferedOutput implements LogOutput {
  private buffer: Array<{ message: string; level: LogLevel; timestamp: Date }> = [];
  private maxBufferSize: number = 100;
  private consoleOutput: ConsoleOutput = new ConsoleOutput();
  
  constructor(maxBufferSize: number = 100) {
    this.maxBufferSize = maxBufferSize;
  }
  
  write(message: string, level: LogLevel): void {
    this.buffer.push({
      message,
      level,
      timestamp: new Date()
    });
    
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }
  
  flush(): void {
    if (this.buffer.length === 0) return;
    
    console.log('=== Buffered Logs Start ===');
    this.buffer.forEach(entry => {
      this.consoleOutput.write(
        `[${entry.timestamp.toISOString()}] ${entry.message}`,
        entry.level
      );
    });
    console.log('=== Buffered Logs End ===');
    
    this.buffer = [];
  }
  
  getBuffer(): Array<{ message: string; level: LogLevel; timestamp: Date }> {
    return [...this.buffer];
  }
}

/**
 * リモート出力（将来の拡張用スタブ）
 */
export class RemoteOutput implements LogOutput {
  private endpoint: string;
  private fallbackOutput: LogOutput = new ConsoleOutput();
  
  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }
  
  write(message: string, level: LogLevel): void {
    // 将来的にはリモートサーバーに送信
    // 現在はフォールバックとしてコンソールに出力
    if (process.env.NODE_ENV === 'development') {
      this.fallbackOutput.write(message, level);
    }
    
    // TODO: 実装例
    // fetch(this.endpoint, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message, level, timestamp: new Date() })
    // }).catch(err => {
    //   this.fallbackOutput.write(`Failed to send log: ${err}`, LogLevel.ERROR);
    // });
  }
}

/**
 * 複数出力先への同時出力
 */
export class MultiOutput implements LogOutput {
  private outputs: LogOutput[] = [];
  
  constructor(outputs: LogOutput[] = []) {
    this.outputs = outputs;
  }
  
  addOutput(output: LogOutput): void {
    this.outputs.push(output);
  }
  
  removeOutput(output: LogOutput): void {
    const index = this.outputs.indexOf(output);
    if (index !== -1) {
      this.outputs.splice(index, 1);
    }
  }
  
  write(message: string, level: LogLevel): void {
    this.outputs.forEach(output => {
      output.write(message, level);
    });
  }
  
  flush(): void {
    this.outputs.forEach(output => {
      if (output.flush) {
        output.flush();
      }
    });
  }
}

export interface DebugLogConfig {
  /** ログのカテゴリ（API、UI、Validationなど） */
  category: string;
  /** 操作名（create、update、deleteなど） */
  operation: string;
  /** 詳細な説明（任意） */
  description?: string;
  /** ログレベル（任意、デフォルトはINFO） */
  level?: LogLevel;
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
  private static formatter: LogFormatter = new SimpleFormatter();
  private static output: LogOutput = new ConsoleOutput();

  /**
   * @deprecated This method does not exist. Use info(), debug(), or error() instead.
   * @throws {Error} Always throws an error when called
   */
  private static log?: never;

  /**
   * フォーマッターを設定
   */
  static setFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
  }

  /**
   * 現在のフォーマッターを取得
   */
  static getFormatter(): LogFormatter {
    return this.formatter;
  }

  /**
   * 出力先を設定
   */
  static setOutput(output: LogOutput): void {
    this.output = output;
  }

  /**
   * 現在の出力先を取得
   */
  static getOutput(): LogOutput {
    return this.output;
  }

  /**
   * バッファをフラッシュ（出力先がサポートしている場合）
   */
  static flush(): void {
    if (this.output.flush) {
      this.output.flush();
    }
  }

  /**
   * LogBuilderを作成（Fluent API）
   */
  static build(): LogBuilder {
    return new LogBuilder();
  }

  /**
   * 共通ロジック: ヘッダーフォーマット
   */
  private static formatHeader(config: DebugLogConfig, suffix: string): string {
    return `=== ${config.category} ${config.operation} ${suffix} ===`;
  }

  /**
   * 共通ロジック: ログ出力判定
   */
  private static shouldLog(level?: LogLevel): boolean {
    if (!this.isDevelopment) return false;
    const logLevel = level ?? LogLevel.INFO;
    return LogConfig.shouldLog(logLevel);
  }

  /**
   * 共通ロジック: セクション単位のログ出力
   */
  private static logSection(header: string, data: Record<string, any>) {
    console.log(header);
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        console.log(`${key}: ${value}`);
      }
    });
  }

  /**
   * 共通ロジック: 内部ログ出力
   */
  private static logInternal(level: LogLevel, config: DebugLogConfig, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;
    
    const formatted = this.formatter.format(level, config, message, data);
    this.output.write(formatted, level);
  }

  /**
   * API操作の開始ログを出力
   */
  static apiStart(config: DebugLogConfig, data: Partial<ApiDebugLogData> = {}) {
    const level = config.level ?? LogLevel.DEBUG;
    if (!this.shouldLog(level)) return;

    const header = this.formatHeader(config, 'API 開始');
    const logData: Record<string, any> = {
      '説明': config.description,
      'URL': data.url,
      'メソッド': data.method,
    };
    
    this.logSection(header, logData);
    
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
    console.log(this.formatHeader(config, 'API 送信データ確認終了'));
  }

  /**
   * API操作の成功ログを出力
   */
  static apiSuccess(config: DebugLogConfig, data: Partial<ApiDebugLogData> = {}) {
    if (!this.shouldLog()) return;

    const header = this.formatHeader(config, 'API 成功');
    const logData: Record<string, any> = {
      'ステータス': data.status,
    };
    
    this.logSection(header, logData);
    
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
    console.log(this.formatHeader(config, 'API 成功終了'));
  }

  /**
   * API操作のエラーログを出力
   */
  static apiError(config: DebugLogConfig, data: Partial<ApiDebugLogData> = {}) {
    if (!this.shouldLog()) return;

    const header = this.formatHeader(config, 'API エラー');
    console.log(header);
    
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
        
        const errorData: Record<string, any> = {
          'エラーレスポンス': axiosError.response?.data,
          'エラーステータス': axiosError.response?.status,
          'エラーヘッダー': axiosError.response?.headers,
          'リクエスト設定': axiosError.config,
          'リクエストデータ': axiosError.config?.data,
        };
        
        Object.entries(errorData).forEach(([key, value]) => {
          if (value !== undefined) {
            console.log(`${key}:`, value);
          }
        });
      }
    }
    if (data.metadata) {
      console.log('メタデータ:', data.metadata);
    }
    console.log(this.formatHeader(config, 'API エラー終了'));
  }

  /**
   * 汎用的なデバッグログを出力
   */
  static debug(config: DebugLogConfig, message: string, data?: unknown) {
    const level = config.level ?? LogLevel.DEBUG;
    this.logInternal(level, config, message, data);
  }

  /**
   * データ変換のログを出力
   */
  static dataConversion(config: DebugLogConfig, beforeData: unknown, afterData: unknown, conversionType: string) {
    if (!this.shouldLog()) return;

    const header = this.formatHeader(config, `データ変換 (${conversionType})`);
    console.log(header);
    console.log('変換前:', beforeData);
    console.log('変換後:', afterData);
    console.log(`=== データ変換終了 ===`);
  }

  /**
   * バリデーションのログを出力
   */
  static validation(config: DebugLogConfig, isValid: boolean, errors?: unknown, data?: unknown) {
    if (!this.shouldLog()) return;

    const header = this.formatHeader(config, 'バリデーション');
    const logData: Record<string, any> = {
      'バリデーション結果': isValid ? '成功' : '失敗',
    };
    
    this.logSection(header, logData);
    
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
    const level = config.level ?? LogLevel.INFO;
    this.logInternal(level, config, message, data);
  }

  /**
   * エラーログを出力
   */
  static error(config: DebugLogConfig, message: string, error?: unknown) {
    if (!this.shouldLog()) return;

    console.error(`[エラー][${config.category}] ${config.operation}: ${message}`);
    if (error !== undefined) {
      console.error('エラー詳細:', error);
      
      // Axiosエラーの場合は詳細情報も出力
      if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
        const axiosError = error as any;
        if (axiosError.response) {
          console.error('レスポンスステータス:', axiosError.response.status);
          console.error('レスポンスデータ:', axiosError.response.data);
        }
        if (axiosError.config) {
          console.error('リクエストURL:', axiosError.config.url);
          console.error('リクエストメソッド:', axiosError.config.method);
        }
      }
    }
  }


  /**
   * 警告ログを出力
   */
  static warn(config: DebugLogConfig, message: string, data?: unknown) {
    const level = config.level ?? LogLevel.WARN;
    this.logInternal(level, config, message, data);
  }

  /**
   * トレースログを出力
   */
  static trace(config: DebugLogConfig, message: string, data?: unknown) {
    const level = config.level ?? LogLevel.TRACE;
    this.logInternal(level, config, message, data);
  }

  /**
   * 致命的エラーログを出力
   */
  static fatal(config: DebugLogConfig, message: string, data?: unknown) {
    const level = config.level ?? LogLevel.FATAL;
    this.logInternal(level, config, message, data);
  }

  /**
   * APIレスポンスのログを出力
   */
  static apiResponse(config: DebugLogConfig, data: Partial<ApiDebugLogData> = {}) {
    if (!this.shouldLog()) return;

    const header = this.formatHeader(config, 'API レスポンス');
    const logData: Record<string, any> = {
      'ステータス': data.status,
      'URL': data.url,
      'メソッド': data.method,
    };
    
    this.logSection(header, logData);
    
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
    console.log(this.formatHeader(config, 'API レスポンス終了'));
  }

  /**
   * APIリクエストのログを出力
   */
  static apiRequest(config: DebugLogConfig, data: ApiDebugLogData) {
    if (!this.shouldLog()) return;

    const header = this.formatHeader(config, 'API 送信');
    const logData: Record<string, any> = {
      '説明': config.description,
      'URL': data.url,
      'メソッド': data.method,
    };
    
    this.logSection(header, logData);
    
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
    console.log(this.formatHeader(config, 'API 送信データ確認終了'));
  }

  /**
   * 処理時間を測定するためのタイマー機能
   */
  static time(label: string) {
    if (!this.shouldLog()) return;
    console.time(label);
  }

  static timeEnd(label: string) {
    if (!this.shouldLog()) return;
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
 * ログビルダークラス（Fluent API）
 */
export class LogBuilder {
  private config: Partial<DebugLogConfig> = {};
  private data: any = undefined;
  private message: string = '';
  
  /**
   * ログレベルを設定
   */
  level(level: LogLevel): this {
    this.config.level = level;
    return this;
  }
  
  /**
   * カテゴリを設定
   */
  category(category: string): this {
    this.config.category = category;
    return this;
  }
  
  /**
   * 操作を設定
   */
  operation(operation: string): this {
    this.config.operation = operation;
    return this;
  }
  
  /**
   * 説明を設定
   */
  description(description: string): this {
    this.config.description = description;
    return this;
  }
  
  /**
   * データを設定
   */
  withData(data: any): this {
    this.data = data;
    return this;
  }
  
  /**
   * メッセージを設定
   */
  withMessage(message: string): this {
    this.message = message;
    return this;
  }
  
  /**
   * TRACEレベルでログ出力
   */
  trace(message?: string): void {
    const finalMessage = message || this.message || 'Trace log';
    const finalConfig = { ...this.config, category: this.config.category || 'TRACE', operation: this.config.operation || 'Trace' } as DebugLogConfig;
    DebugLogger.trace(finalConfig, finalMessage, this.data);
  }
  
  /**
   * DEBUGレベルでログ出力
   */
  debug(message?: string): void {
    const finalMessage = message || this.message || 'Debug log';
    const finalConfig = { ...this.config, category: this.config.category || 'DEBUG', operation: this.config.operation || 'Debug' } as DebugLogConfig;
    DebugLogger.debug(finalConfig, finalMessage, this.data);
  }
  
  /**
   * INFOレベルでログ出力
   */
  info(message?: string): void {
    const finalMessage = message || this.message || 'Info log';
    const finalConfig = { ...this.config, category: this.config.category || 'INFO', operation: this.config.operation || 'Info' } as DebugLogConfig;
    DebugLogger.info(finalConfig, finalMessage, this.data);
  }
  
  /**
   * WARNレベルでログ出力
   */
  warn(message?: string): void {
    const finalMessage = message || this.message || 'Warning log';
    const finalConfig = { ...this.config, category: this.config.category || 'WARN', operation: this.config.operation || 'Warning' } as DebugLogConfig;
    DebugLogger.warn(finalConfig, finalMessage, this.data);
  }
  
  /**
   * ERRORレベルでログ出力
   */
  error(message?: string): void {
    const finalMessage = message || this.message || 'Error log';
    const finalConfig = { ...this.config, category: this.config.category || 'ERROR', operation: this.config.operation || 'Error' } as DebugLogConfig;
    const configWithLevel = { ...finalConfig, level: LogLevel.ERROR };
    DebugLogger.error(configWithLevel, finalMessage, this.data);
  }
  
  /**
   * FATALレベルでログ出力
   */
  fatal(message?: string): void {
    const finalMessage = message || this.message || 'Fatal error';
    const finalConfig = { ...this.config, category: this.config.category || 'FATAL', operation: this.config.operation || 'Fatal' } as DebugLogConfig;
    DebugLogger.fatal(finalConfig, finalMessage, this.data);
  }
  
  /**
   * 汎用ログ出力
   */
  log(message?: string): void {
    const finalMessage = message || this.message || 'Log';
    const finalLevel = this.config.level || LogLevel.INFO;
    const finalConfig = { 
      ...this.config, 
      category: this.config.category || 'LOG', 
      operation: this.config.operation || 'Log',
      level: finalLevel
    } as DebugLogConfig;
    
    // レベルに応じて適切なメソッドを呼び出す
    switch (finalLevel) {
      case LogLevel.TRACE:
        DebugLogger.trace(finalConfig, finalMessage, this.data);
        break;
      case LogLevel.DEBUG:
        DebugLogger.debug(finalConfig, finalMessage, this.data);
        break;
      case LogLevel.INFO:
        DebugLogger.info(finalConfig, finalMessage, this.data);
        break;
      case LogLevel.WARN:
        DebugLogger.warn(finalConfig, finalMessage, this.data);
        break;
      case LogLevel.ERROR:
        DebugLogger.error(finalConfig, finalMessage, this.data);
        break;
      case LogLevel.FATAL:
        DebugLogger.fatal(finalConfig, finalMessage, this.data);
        break;
      default:
        DebugLogger.info(finalConfig, finalMessage, this.data);
    }
  }
}

/**
 * 使用例:
 * 
 * // 従来の使用方法
 * DebugLogger.apiStart(
 *   { category: DEBUG_CATEGORIES.API, operation: DEBUG_OPERATIONS.CREATE, description: '週報作成' },
 *   { url: '/api/v1/weekly-reports', method: 'POST', requestData: weeklyReport }
 * );
 * 
 * // ログレベルを指定
 * DebugLogger.info(
 *   { category: 'API', operation: 'Update', level: LogLevel.DEBUG },
 *   'Updating user profile',
 *   { userId: 123 }
 * );
 * 
 * // Builderパターンの使用
 * DebugLogger.build()
 *   .level(LogLevel.INFO)
 *   .category('API')
 *   .operation('Create')
 *   .withData({ userId: 123, userName: 'John' })
 *   .info('User created successfully');
 * 
 * // カスタムフォーマッターの設定
 * DebugLogger.setFormatter(new JSONFormatter());
 * 
 * // カスタム出力先の設定
 * const bufferedOutput = new BufferedOutput(50);
 * DebugLogger.setOutput(bufferedOutput);
 * // ... ログ出力 ...
 * DebugLogger.flush(); // バッファをフラッシュ
 * 
 * // ログレベルの調整
 * LogConfig.setLevel(LogLevel.WARN); // WARN以上のみ出力
 */ 