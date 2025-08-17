/**
 * インターセプター管理
 * 重複防止機構と統合インターセプター設定
 */

import { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { handleApiError } from '@/lib/api/error';
import { DebugLogger } from '@/lib/debug/logger';

export type InterceptorType = 'auth' | 'retry' | 'logging' | 'error' | 'custom';

interface InterceptorRegistration {
  requestIds: number[];
  responseIds: number[];
  type: InterceptorType;
}

export class InterceptorManager {
  // WeakMapを使用してクライアントごとのインターセプター登録を管理
  private registrations = new WeakMap<AxiosInstance, Map<InterceptorType, InterceptorRegistration>>();

  /**
   * インターセプターを一度だけ登録
   * @param client Axiosインスタンス
   * @param type インターセプタータイプ
   * @returns 新規登録されたかどうか
   */
  registerOnce(client: AxiosInstance, type: InterceptorType): boolean {
    // クライアントの登録マップを取得または作成
    if (!this.registrations.has(client)) {
      this.registrations.set(client, new Map());
    }
    const clientRegistrations = this.registrations.get(client)!;

    // すでに登録済みの場合はスキップ
    if (clientRegistrations.has(type)) {
      console.debug(`[InterceptorManager] ${type} interceptor already registered`);
      return false;
    }

    // 新規登録
    clientRegistrations.set(type, {
      requestIds: [],
      responseIds: [],
      type
    });

    return true;
  }

  /**
   * 認証インターセプターの設定
   * @param client Axiosインスタンス
   */
  setupAuth(client: AxiosInstance): void {
    if (!this.registerOnce(client, 'auth')) {
      return;
    }

    const registration = this.getRegistration(client, 'auth')!;

    // リクエストインターセプター
    const requestId = client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Cookieベースの認証のため、withCredentialsを確保
        config.withCredentials = true;
        
        // デバッグログ
        DebugLogger.apiRequest({
          category: 'API',
          operation: '認証インターセプター'
        }, {
          url: config.url,
          method: config.method,
          withCredentials: config.withCredentials
        });

        return config;
      },
      (error) => {
        DebugLogger.apiError({
          category: 'API',
          operation: '認証インターセプターエラー'
        }, { error });
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター（401エラー処理）
    const responseId = client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          DebugLogger.apiError({
            category: 'API',
            operation: '認証エラー'
          }, {
            status: 401,
            url: error.config?.url
          });

          // 認証エラー時の処理
          // トークンリフレッシュや再ログインへのリダイレクトなど
          // ここでは元のエラーをそのまま返す
        }
        return Promise.reject(error);
      }
    );

    registration.requestIds.push(requestId);
    registration.responseIds.push(responseId);
  }

  /**
   * リトライインターセプターの設定
   * @param client Axiosインスタンス
   * @param maxRetries 最大リトライ回数
   * @param retryDelay リトライ間隔（ミリ秒）
   */
  setupRetry(client: AxiosInstance, maxRetries = 3, retryDelay = 1000): void {
    if (!this.registerOnce(client, 'retry')) {
      return;
    }

    const registration = this.getRegistration(client, 'retry')!;

    // レスポンスインターセプター（リトライロジック）
    const responseId = client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
        
        // リトライ対象のステータスコード
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        
        if (
          config &&
          error.response &&
          retryableStatuses.includes(error.response.status) &&
          (!config._retryCount || config._retryCount < maxRetries)
        ) {
          config._retryCount = (config._retryCount || 0) + 1;
          
          DebugLogger.info({
            category: 'API',
            operation: 'リトライ'
          }, `リトライ ${config._retryCount}/${maxRetries}`, {
            url: config.url,
            status: error.response.status
          });

          // 指数バックオフ
          const delay = retryDelay * Math.pow(2, config._retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return client.request(config);
        }
        
        return Promise.reject(error);
      }
    );

    registration.responseIds.push(responseId);
  }

  /**
   * ロギングインターセプターの設定
   * @param client Axiosインスタンス
   */
  setupLogging(client: AxiosInstance): void {
    if (!this.registerOnce(client, 'logging')) {
      return;
    }

    const registration = this.getRegistration(client, 'logging')!;

    // リクエストインターセプター
    const requestId = client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const startTime = Date.now();
        (config as any)._startTime = startTime;

        DebugLogger.apiRequest({
          category: 'API',
          operation: 'リクエスト送信'
        }, {
          url: config.url,
          method: config.method,
          params: config.params,
          timestamp: new Date(startTime).toISOString()
        });

        return config;
      },
      (error) => {
        DebugLogger.apiError({
          category: 'API',
          operation: 'リクエストエラー'
        }, { error });
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター
    const responseId = client.interceptors.response.use(
      (response) => {
        const endTime = Date.now();
        const startTime = (response.config as any)._startTime || endTime;
        const duration = endTime - startTime;

        DebugLogger.apiResponse({
          category: 'API',
          operation: 'レスポンス受信'
        }, {
          url: response.config.url,
          method: response.config.method,
          status: response.status,
          duration: `${duration}ms`,
          timestamp: new Date(endTime).toISOString()
        });

        return response;
      },
      (error: AxiosError) => {
        const endTime = Date.now();
        const startTime = error.config ? (error.config as any)._startTime || endTime : endTime;
        const duration = endTime - startTime;

        DebugLogger.apiError({
          category: 'API',
          operation: 'レスポンスエラー'
        }, {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          duration: `${duration}ms`,
          error: error.message,
          timestamp: new Date(endTime).toISOString()
        });

        return Promise.reject(error);
      }
    );

    registration.requestIds.push(requestId);
    registration.responseIds.push(responseId);
  }

  /**
   * エラーハンドリングインターセプターの設定
   * @param client Axiosインスタンス
   */
  setupErrorHandling(client: AxiosInstance): void {
    if (!this.registerOnce(client, 'error')) {
      return;
    }

    const registration = this.getRegistration(client, 'error')!;

    // レスポンスインターセプター（統一エラーハンドリング）
    const responseId = client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // 統一エラーハンドリング
        const handledError = handleApiError(error);

        // エラー情報をログ
        DebugLogger.apiError({
          category: 'API',
          operation: 'エラーハンドリング'
        }, {
          type: handledError.type,
          message: handledError.message,
          status: handledError.status,
          url: error.config?.url
        });

        // 処理済みエラーとしてマーク
        (error as any)._handled = true;
        (error as any)._handledError = handledError;

        return Promise.reject(error);
      }
    );

    registration.responseIds.push(responseId);
  }

  /**
   * すべてのインターセプターを削除
   * @param client Axiosインスタンス
   */
  removeAll(client: AxiosInstance): void {
    const clientRegistrations = this.registrations.get(client);
    if (!clientRegistrations) {
      return;
    }

    // 各登録されたインターセプターを削除
    clientRegistrations.forEach((registration) => {
      registration.requestIds.forEach(id => {
        client.interceptors.request.eject(id);
      });
      registration.responseIds.forEach(id => {
        client.interceptors.response.eject(id);
      });
    });

    // 登録情報をクリア
    this.registrations.delete(client);
  }

  /**
   * 特定のタイプのインターセプターを削除
   * @param client Axiosインスタンス
   * @param type インターセプタータイプ
   */
  remove(client: AxiosInstance, type: InterceptorType): void {
    const clientRegistrations = this.registrations.get(client);
    if (!clientRegistrations) {
      return;
    }

    const registration = clientRegistrations.get(type);
    if (!registration) {
      return;
    }

    // インターセプターを削除
    registration.requestIds.forEach(id => {
      client.interceptors.request.eject(id);
    });
    registration.responseIds.forEach(id => {
      client.interceptors.response.eject(id);
    });

    // 登録情報を削除
    clientRegistrations.delete(type);
  }

  /**
   * 登録情報を取得
   * @param client Axiosインスタンス
   * @param type インターセプタータイプ
   * @returns 登録情報またはundefined
   */
  private getRegistration(client: AxiosInstance, type: InterceptorType): InterceptorRegistration | undefined {
    const clientRegistrations = this.registrations.get(client);
    return clientRegistrations?.get(type);
  }

  /**
   * インターセプターが登録されているか確認
   * @param client Axiosインスタンス
   * @param type インターセプタータイプ
   * @returns 登録されているかどうか
   */
  isRegistered(client: AxiosInstance, type: InterceptorType): boolean {
    const clientRegistrations = this.registrations.get(client);
    return clientRegistrations?.has(type) || false;
  }

  /**
   * 登録されているインターセプタータイプの一覧を取得
   * @param client Axiosインスタンス
   * @returns インターセプタータイプの配列
   */
  getRegisteredTypes(client: AxiosInstance): InterceptorType[] {
    const clientRegistrations = this.registrations.get(client);
    return clientRegistrations ? Array.from(clientRegistrations.keys()) : [];
  }
}