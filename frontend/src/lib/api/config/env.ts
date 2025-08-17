/**
 * 環境変数管理モジュール
 * 
 * APIクライアントの環境変数を統一的に管理し、
 * 後方互換性を維持しながら新しい環境変数への移行を支援
 */

/**
 * API設定の環境変数インターフェース
 */
export interface ApiEnvironmentConfig {
  /** APIホスト（例: http://localhost:8080） */
  host: string;
  /** APIバージョン（例: v1） */
  version: string;
  /** 完全なベースURL（ホスト + /api/ + バージョン） */
  baseUrl: string;
  /** レガシーURL（後方互換性のため） */
  legacyUrl?: string;
  /** 環境タイプ */
  environment: 'development' | 'staging' | 'production';
}

/**
 * 環境別のAPIホスト設定
 */
interface EnvironmentHosts {
  staging?: string;
  production?: string;
}

/**
 * デフォルト値
 */
const DEFAULTS = {
  HOST: 'http://localhost:8080',
  VERSION: 'v1',
  ENVIRONMENT: 'development' as const,
} as const;

/**
 * 現在の環境を判定
 */
function getCurrentEnvironment(): 'development' | 'staging' | 'production' {
  const nodeEnv = process.env.NODE_ENV;
  
  // Next.jsのビルドモードから判定
  if (nodeEnv === 'production') {
    // 本番ビルドの場合、URLから判定
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('staging') || hostname.includes('stg')) {
        return 'staging';
      }
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
      }
      return 'production';
    }
    return 'production';
  }
  
  return 'development';
}

/**
 * 環境変数から API 設定を読み込み
 * 
 * 優先順位:
 * 1. 新しい環境変数 (NEXT_PUBLIC_API_HOST + NEXT_PUBLIC_API_VERSION)
 * 2. レガシー環境変数 (NEXT_PUBLIC_API_URL)
 * 3. デフォルト値
 */
export function loadApiEnvironment(): ApiEnvironmentConfig {
  const environment = getCurrentEnvironment();
  
  // レガシーURL（後方互換性）
  const legacyUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // 新しい環境変数
  const apiHost = process.env.NEXT_PUBLIC_API_HOST;
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION;
  
  // 環境別ホスト
  const environmentHosts: EnvironmentHosts = {
    staging: process.env.NEXT_PUBLIC_STAGING_API_HOST,
    production: process.env.NEXT_PUBLIC_PRODUCTION_API_HOST,
  };
  
  // ホストの決定（優先順位に従って）
  let host: string;
  let version: string = apiVersion || DEFAULTS.VERSION;
  
  // 環境別ホストが設定されている場合はそれを優先
  if (environment !== 'development' && environmentHosts[environment]) {
    host = environmentHosts[environment]!;
  } else if (apiHost) {
    // 新しい環境変数が設定されている場合
    host = apiHost;
  } else if (legacyUrl) {
    // レガシーURLから抽出を試みる
    const urlMatch = legacyUrl.match(/^(https?:\/\/[^/]+)(\/api\/v\d+)?$/);
    if (urlMatch) {
      host = urlMatch[1];
      if (urlMatch[2]) {
        // /api/v1 のようなパスが含まれている場合、バージョンを抽出
        const versionMatch = urlMatch[2].match(/v(\d+)/);
        if (versionMatch) {
          version = `v${versionMatch[1]}`;
        }
      }
    } else {
      // パース失敗時はそのまま使用
      host = legacyUrl;
    }
  } else {
    // デフォルト値を使用
    host = DEFAULTS.HOST;
  }
  
  // ベースURLの構築
  const baseUrl = legacyUrl || `${host}/api/${version}`;
  
  // 開発環境での警告表示
  if (process.env.NODE_ENV === 'development') {
    if (legacyUrl && !apiHost) {
      console.warn(
        '[API Config] Using legacy NEXT_PUBLIC_API_URL. ' +
        'Please migrate to NEXT_PUBLIC_API_HOST and NEXT_PUBLIC_API_VERSION.'
      );
    }
    
    console.info('[API Config] Loaded configuration:', {
      host,
      version,
      baseUrl,
      environment,
      usingLegacy: !!legacyUrl && !apiHost,
    });
  }
  
  return {
    host,
    version,
    baseUrl,
    legacyUrl,
    environment,
  };
}

/**
 * 環境変数の検証
 * 起動時に実行して設定の問題を早期発見
 */
export function validateApiEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = loadApiEnvironment();
  
  // URLの形式チェック
  try {
    new URL(config.baseUrl);
  } catch {
    errors.push(`Invalid API URL format: ${config.baseUrl}`);
  }
  
  // HTTPSチェック（本番環境のみ）
  if (config.environment === 'production' && !config.host.startsWith('https://')) {
    errors.push('Production API should use HTTPS');
  }
  
  // レガシー環境変数の使用チェック
  if (config.legacyUrl && !process.env.NEXT_PUBLIC_API_HOST) {
    errors.push('Using deprecated NEXT_PUBLIC_API_URL. Please migrate to new environment variables.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * シングルトンインスタンス（キャッシュ）
 */
let cachedConfig: ApiEnvironmentConfig | null = null;

/**
 * API環境設定を取得（キャッシュ付き）
 */
export function getApiEnvironment(): ApiEnvironmentConfig {
  if (!cachedConfig) {
    cachedConfig = loadApiEnvironment();
  }
  return cachedConfig;
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearEnvironmentCache(): void {
  cachedConfig = null;
}

// デフォルトエクスポート
export default getApiEnvironment;