/**
 * 統一API設定モジュールのユニットテスト
 */

import { 
  UnifiedApiConfig,
  EnvironmentOverrides,
  PresetDefinitions,
  TimeoutSettings,
  createUnifiedConfig,
  getUnifiedApiConfig,
  mergeConfigs,
  getEnvironmentOverride,
  DEFAULT_API_CONFIG,
  API_TIMEOUTS,
  ENV_OVERRIDES,
  PRESET_CONFIGS
} from '../unified';

// モック設定
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('UnifiedApiConfig', () => {
  describe('デフォルト設定', () => {
    it('正しいデフォルト値が設定されている', () => {
      expect(DEFAULT_API_CONFIG).toEqual({
        withCredentials: true,
        timeout: expect.any(Number),
        headers: {
          'Content-Type': 'application/json',
        },
        enableAuth: true,
        enableRetry: true,
        enableLogging: false,
        enableErrorHandling: true,
        maxRetries: 3,
        retryDelay: 1000,
      });
    });

    it('タイムアウト設定が正しく定義されている', () => {
      expect(API_TIMEOUTS.DEFAULT).toBe(30000);
      expect(API_TIMEOUTS.SHORT).toBe(5000);
      expect(API_TIMEOUTS.LONG).toBe(60000);
      expect(API_TIMEOUTS.UPLOAD).toBe(120000);
      expect(API_TIMEOUTS.BATCH).toBe(300000);
    });
  });

  describe('環境別オーバーライド', () => {
    it('開発環境の設定が正しい', () => {
      const devOverride = ENV_OVERRIDES.development;
      expect(devOverride.enableLogging).toBe(true);
      expect(devOverride.timeout).toBe(60000);
      expect(devOverride.maxRetries).toBe(5);
      expect(devOverride.enableProfiling).toBe(true);
    });

    it('ステージング環境の設定が正しい', () => {
      const stagingOverride = ENV_OVERRIDES.staging;
      expect(stagingOverride.enableLogging).toBe(false);
      expect(stagingOverride.timeout).toBe(30000);
      expect(stagingOverride.maxRetries).toBe(3);
      expect(stagingOverride.enableProfiling).toBe(false);
    });

    it('本番環境の設定が正しい', () => {
      const prodOverride = ENV_OVERRIDES.production;
      expect(prodOverride.enableLogging).toBe(false);
      expect(prodOverride.timeout).toBe(30000);
      expect(prodOverride.maxRetries).toBe(2);
      expect(prodOverride.enableProfiling).toBe(false);
      expect(prodOverride.compressionEnabled).toBe(true);
    });
  });

  describe('プリセット設定', () => {
    it('認証プリセットが正しく定義されている', () => {
      const authPreset = PRESET_CONFIGS.auth;
      expect(authPreset.withCredentials).toBe(true);
      expect(authPreset.enableAuth).toBe(true);
      expect(authPreset.timeout).toBe(API_TIMEOUTS.DEFAULT);
    });

    it('管理者プリセットが正しく定義されている', () => {
      const adminPreset = PRESET_CONFIGS.admin;
      expect(adminPreset.withCredentials).toBe(true);
      expect(adminPreset.enableAuth).toBe(true);
      expect(adminPreset.enableLogging).toBe(true);
      expect(adminPreset.headers?.['X-Admin-Request']).toBe('true');
    });

    it('公開APIプリセットが正しく定義されている', () => {
      const publicPreset = PRESET_CONFIGS.public;
      expect(publicPreset.withCredentials).toBe(false);
      expect(publicPreset.enableAuth).toBe(false);
      expect(publicPreset.timeout).toBe(API_TIMEOUTS.SHORT);
    });

    it('アップロードプリセットが正しく定義されている', () => {
      const uploadPreset = PRESET_CONFIGS.upload;
      expect(uploadPreset.timeout).toBe(API_TIMEOUTS.UPLOAD);
      expect(uploadPreset.headers?.['Content-Type']).toBe('multipart/form-data');
      expect(uploadPreset.enableRetry).toBe(false);
    });

    it('バッチプリセットが正しく定義されている', () => {
      const batchPreset = PRESET_CONFIGS.batch;
      expect(batchPreset.timeout).toBe(API_TIMEOUTS.BATCH);
      expect(batchPreset.maxRetries).toBe(5);
      expect(batchPreset.retryDelay).toBe(2000);
    });

    it('リアルタイムプリセットが正しく定義されている', () => {
      const realtimePreset = PRESET_CONFIGS.realtime;
      expect(realtimePreset.timeout).toBe(API_TIMEOUTS.SHORT);
      expect(realtimePreset.enableRetry).toBe(false);
      expect(realtimePreset.enableWebSocket).toBe(true);
    });
  });

  describe('createUnifiedConfig', () => {
    it('デフォルト設定を返す', () => {
      const config = createUnifiedConfig();
      expect(config).toEqual(DEFAULT_API_CONFIG);
    });

    it('カスタム設定をマージする', () => {
      const customConfig = {
        timeout: 15000,
        headers: {
          'X-Custom-Header': 'test',
        },
      };
      const config = createUnifiedConfig(customConfig);
      expect(config.timeout).toBe(15000);
      expect(config.headers?.['X-Custom-Header']).toBe('test');
      expect(config.headers?.['Content-Type']).toBe('application/json');
    });

    it('プリセットを適用する', () => {
      const config = createUnifiedConfig({ preset: 'upload' });
      expect(config.timeout).toBe(API_TIMEOUTS.UPLOAD);
      expect(config.headers?.['Content-Type']).toBe('multipart/form-data');
    });

    it('環境オーバーライドを適用する', () => {
      const config = createUnifiedConfig({ environment: 'development' });
      expect(config.enableLogging).toBe(true);
      expect(config.enableProfiling).toBe(true);
    });

    it('プリセット→環境→カスタムの優先順位で適用される', () => {
      const config = createUnifiedConfig({
        preset: 'public',
        environment: 'development',
        timeout: 25000,
      });
      // カスタム設定が最優先
      expect(config.timeout).toBe(25000);
      // 環境設定がプリセットを上書き
      expect(config.enableLogging).toBe(true);
      // プリセットの設定が残る
      expect(config.withCredentials).toBe(false);
    });
  });

  describe('getUnifiedApiConfig', () => {
    it('環境変数からタイムアウトを読み取る', () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT = '45000';
      const config = getUnifiedApiConfig();
      expect(config.timeout).toBe(45000);
    });

    it('環境変数が不正な場合はデフォルト値を使用', () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT = 'invalid';
      const config = getUnifiedApiConfig();
      expect(config.timeout).toBe(API_TIMEOUTS.DEFAULT);
    });

    it('NODE_ENVに基づいて設定を調整', () => {
      process.env.NODE_ENV = 'development';
      const config = getUnifiedApiConfig();
      expect(config.enableLogging).toBe(true);
    });
  });

  describe('mergeConfigs', () => {
    it('複数の設定を正しくマージする', () => {
      const config1: UnifiedApiConfig = {
        timeout: 10000,
        headers: { 'X-Header-1': 'value1' },
      };
      const config2: UnifiedApiConfig = {
        timeout: 20000,
        headers: { 'X-Header-2': 'value2' },
        withCredentials: false,
      };
      const config3: UnifiedApiConfig = {
        headers: { 'X-Header-3': 'value3' },
        maxRetries: 10,
      };

      const merged = mergeConfigs(config1, config2, config3);
      
      expect(merged.timeout).toBe(20000); // config2の値
      expect(merged.withCredentials).toBe(false); // config2の値
      expect(merged.maxRetries).toBe(10); // config3の値
      expect(merged.headers).toEqual({
        'X-Header-1': 'value1',
        'X-Header-2': 'value2',
        'X-Header-3': 'value3',
      });
    });

    it('undefined値は無視される', () => {
      const config1: UnifiedApiConfig = {
        timeout: 10000,
        withCredentials: true,
      };
      const config2: UnifiedApiConfig = {
        timeout: undefined,
        withCredentials: undefined,
        maxRetries: 5,
      };

      const merged = mergeConfigs(config1, config2);
      
      expect(merged.timeout).toBe(10000); // config1の値が維持される
      expect(merged.withCredentials).toBe(true); // config1の値が維持される
      expect(merged.maxRetries).toBe(5); // config2の値
    });

    it('ネストされたオブジェクトを深くマージする', () => {
      const config1: UnifiedApiConfig = {
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value1',
        },
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
        },
      };
      const config2: UnifiedApiConfig = {
        headers: {
          'X-Custom': 'value2',
          'Authorization': 'Bearer token',
        },
        retryConfig: {
          retryDelay: 2000,
        },
      };

      const merged = mergeConfigs(config1, config2);
      
      expect(merged.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Custom': 'value2', // 上書きされる
        'Authorization': 'Bearer token',
      });
      expect(merged.retryConfig).toEqual({
        maxRetries: 3,
        retryDelay: 2000, // 上書きされる
      });
    });
  });

  describe('getEnvironmentOverride', () => {
    it('有効な環境に対してオーバーライドを返す', () => {
      const devOverride = getEnvironmentOverride('development');
      expect(devOverride).toBeDefined();
      expect(devOverride.enableLogging).toBe(true);

      const prodOverride = getEnvironmentOverride('production');
      expect(prodOverride).toBeDefined();
      expect(prodOverride.compressionEnabled).toBe(true);
    });

    it('無効な環境に対して空オブジェクトを返す', () => {
      const override = getEnvironmentOverride('invalid' as any);
      expect(override).toEqual({});
    });

    it('環境がnullまたはundefinedの場合空オブジェクトを返す', () => {
      expect(getEnvironmentOverride(null as any)).toEqual({});
      expect(getEnvironmentOverride(undefined as any)).toEqual({});
    });
  });

  describe('統合シナリオテスト', () => {
    it('認証APIクライアント設定が正しく生成される', () => {
      process.env.NODE_ENV = 'production';
      const config = createUnifiedConfig({
        preset: 'auth',
        environment: 'production',
        authToken: 'test-token',
      });

      expect(config.withCredentials).toBe(true);
      expect(config.enableAuth).toBe(true);
      expect(config.enableLogging).toBe(false); // 本番環境
      expect(config.maxRetries).toBe(2); // 本番環境の設定
      expect(config.authToken).toBe('test-token');
    });

    it('開発環境でのデバッグ設定が有効になる', () => {
      process.env.NODE_ENV = 'development';
      const config = createUnifiedConfig({
        environment: 'development',
      });

      expect(config.enableLogging).toBe(true);
      expect(config.enableProfiling).toBe(true);
      expect(config.timeout).toBe(60000);
      expect(config.maxRetries).toBe(5);
    });

    it('パブリックAPIの設定が認証を無効化する', () => {
      const config = createUnifiedConfig({
        preset: 'public',
      });

      expect(config.withCredentials).toBe(false);
      expect(config.enableAuth).toBe(false);
      expect(config.timeout).toBe(API_TIMEOUTS.SHORT);
    });
  });

  describe('エッジケース', () => {
    it('循環参照を含む設定でもクラッシュしない', () => {
      const config: any = { a: {} };
      config.a.b = config;
      
      expect(() => {
        mergeConfigs(DEFAULT_API_CONFIG, config);
      }).not.toThrow();
    });

    it('非常に深いネストでも正しくマージされる', () => {
      const deepConfig = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep',
                },
              },
            },
          },
        },
      };

      const merged = mergeConfigs({}, deepConfig);
      expect(merged.level1?.level2?.level3?.level4?.level5?.value).toBe('deep');
    });

    it('配列を含む設定が正しく処理される', () => {
      const config1 = {
        interceptors: ['auth', 'logging'],
      };
      const config2 = {
        interceptors: ['error', 'retry'],
      };

      const merged = mergeConfigs(config1, config2);
      // 配列は置き換えられる（マージされない）
      expect(merged.interceptors).toEqual(['error', 'retry']);
    });
  });
});