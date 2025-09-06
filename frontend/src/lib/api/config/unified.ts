/**
 * 統一API設定モジュール
 * すべてのAPIクライアント設定を一元管理
 */

import { AxiosRequestConfig } from 'axios';
import { API_TIMEOUTS } from '@/constants/delays';

/**
 * API設定の型定義
 */
export interface UnifiedApiConfig extends AxiosRequestConfig {
  withCredentials?: boolean;
  timeout?: number;
  headers?: Record<string, string>;
  baseURL?: string;
}

/**
 * 環境別設定の型定義
 */
export interface EnvironmentConfig {
  development?: Partial<UnifiedApiConfig>;
  production?: Partial<UnifiedApiConfig>;
  test?: Partial<UnifiedApiConfig>;
}

/**
 * デフォルトAPI設定
 * すべてのAPIクライアントに適用される基本設定
 */
export const DEFAULT_API_CONFIG: UnifiedApiConfig = {
  // Cookie認証のための設定（統一）
  withCredentials: true,
  
  // タイムアウト設定（環境変数でオーバーライド可能）
  timeout: process.env.NEXT_PUBLIC_API_TIMEOUT 
    ? parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT, 10)
    : API_TIMEOUTS.DEFAULT,
  
  // 共通ヘッダー
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * 環境別設定のオーバーライド
 */
export const ENVIRONMENT_OVERRIDES: EnvironmentConfig = {
  development: {
    // 開発環境では長めのタイムアウト
    timeout: 60000,
  },
  production: {
    // 本番環境では追加のセキュリティヘッダー
    headers: {
      ...DEFAULT_API_CONFIG.headers,
      'X-CSRF-Protection': '1',
    },
  },
  test: {
    // テスト環境では短いタイムアウト
    timeout: 5000,
    withCredentials: false, // テスト時はCookie認証を無効化
  },
};

/**
 * 現在の環境を取得
 */
function getCurrentEnvironment(): keyof EnvironmentConfig {
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

/**
 * 環境に応じた設定を取得
 * @param customConfig カスタム設定（オプション）
 * @returns マージされた設定
 */
export function getUnifiedApiConfig(customConfig?: Partial<UnifiedApiConfig>): UnifiedApiConfig {
  const env = getCurrentEnvironment();
  const envOverrides = ENVIRONMENT_OVERRIDES[env] || {};
  
  // 設定の優先順位: カスタム設定 > 環境別設定 > デフォルト設定
  return {
    ...DEFAULT_API_CONFIG,
    ...envOverrides,
    ...customConfig,
    headers: {
      ...DEFAULT_API_CONFIG.headers,
      ...(envOverrides.headers || {}),
      ...(customConfig?.headers || {}),
    },
  };
}

/**
 * 特定用途向けのプリセット設定
 */
export const API_CONFIG_PRESETS = {
  // 認証API用設定
  auth: getUnifiedApiConfig({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080',
  }),
  
  // 管理者API用設定
  admin: getUnifiedApiConfig({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080',
    headers: {
      'X-Admin-Request': 'true',
    },
  }),
  
  // ファイルアップロード用設定
  upload: getUnifiedApiConfig({
    timeout: 120000,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  // 公開API用設定（認証不要）
  public: getUnifiedApiConfig({
    withCredentials: false,
    timeout: API_TIMEOUTS.SHORT || 10000,
  }),
};

/**
 * 設定検証ユーティリティ
 */
export function validateApiConfig(config: UnifiedApiConfig): boolean {
  // タイムアウトの妥当性チェック
  if (config.timeout && (config.timeout < 0 || config.timeout > 300000)) {
    console.warn('API timeout value is out of reasonable range (0-300000ms)');
    return false;
  }
  
  // baseURLの検証
  if (config.baseURL) {
    try {
      new URL(config.baseURL);
    } catch {
      console.error('Invalid baseURL in API configuration');
      return false;
    }
  }
  
  return true;
}

/**
 * デバッグ用: 現在の設定を出力
 */
export function debugApiConfig(): void {
  if (process.env.NODE_ENV === 'development') {
    const config = getUnifiedApiConfig();
    console.log('Current API Configuration:', {
      environment: getCurrentEnvironment(),
      config: {
        withCredentials: config.withCredentials,
        timeout: config.timeout,
        headers: config.headers,
        baseURL: config.baseURL,
      },
    });
  }
}
