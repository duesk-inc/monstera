/**
 * 環境変数管理モジュールのテスト
 */

import { 
  loadApiEnvironment, 
  validateApiEnvironment, 
  getApiEnvironment,
  clearEnvironmentCache 
} from './env';

describe('API Environment Configuration', () => {
  // 元の環境変数を保存
  const originalEnv = process.env;

  beforeEach(() => {
    // 各テストの前に環境変数をリセット
    jest.resetModules();
    process.env = { ...originalEnv };
    clearEnvironmentCache();
  });

  afterAll(() => {
    // テスト後に環境変数を復元
    process.env = originalEnv;
  });

  describe('loadApiEnvironment', () => {
    it('should use new environment variables when available', () => {
      process.env.NEXT_PUBLIC_API_HOST = 'https://api.example.com';
      process.env.NEXT_PUBLIC_API_VERSION = 'v2';

      const config = loadApiEnvironment();

      expect(config.host).toBe('https://api.example.com');
      expect(config.version).toBe('v2');
      expect(config.baseUrl).toBe('https://api.example.com/api/v2');
    });

    it('should fallback to legacy URL when new variables are not set', () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://legacy.example.com/api/v1';
      delete process.env.NEXT_PUBLIC_API_HOST;
      delete process.env.NEXT_PUBLIC_API_VERSION;

      const config = loadApiEnvironment();

      expect(config.host).toBe('http://legacy.example.com');
      expect(config.version).toBe('v1');
      expect(config.baseUrl).toBe('http://legacy.example.com/api/v1');
      expect(config.legacyUrl).toBe('http://legacy.example.com/api/v1');
    });

    it('should use default values when no environment variables are set', () => {
      delete process.env.NEXT_PUBLIC_API_HOST;
      delete process.env.NEXT_PUBLIC_API_VERSION;
      delete process.env.NEXT_PUBLIC_API_URL;

      const config = loadApiEnvironment();

      expect(config.host).toBe('http://localhost:8080');
      expect(config.version).toBe('v1');
      expect(config.baseUrl).toBe('http://localhost:8080/api/v1');
    });

    it('should prioritize new variables over legacy URL', () => {
      process.env.NEXT_PUBLIC_API_HOST = 'https://new.example.com';
      process.env.NEXT_PUBLIC_API_VERSION = 'v3';
      process.env.NEXT_PUBLIC_API_URL = 'http://legacy.example.com/api/v1';

      const config = loadApiEnvironment();

      expect(config.host).toBe('https://new.example.com');
      expect(config.version).toBe('v3');
      expect(config.baseUrl).toBe('http://legacy.example.com/api/v1'); // Legacy URL takes precedence for baseUrl
    });

    it('should use environment-specific host for staging', () => {
      process.env.NEXT_PUBLIC_STAGING_API_HOST = 'https://staging-api.example.com';
      process.env.NODE_ENV = 'production';
      
      // Mock window.location for staging detection
      Object.defineProperty(global, 'window', {
        value: { location: { hostname: 'staging.example.com' } },
        writable: true,
      });

      const config = loadApiEnvironment();

      expect(config.environment).toBe('staging');
      expect(config.host).toBe('https://staging-api.example.com');
    });

    it('should use environment-specific host for production', () => {
      process.env.NEXT_PUBLIC_PRODUCTION_API_HOST = 'https://api.example.com';
      process.env.NODE_ENV = 'production';
      
      // Mock window.location for production detection
      Object.defineProperty(global, 'window', {
        value: { location: { hostname: 'app.example.com' } },
        writable: true,
      });

      const config = loadApiEnvironment();

      expect(config.environment).toBe('production');
      expect(config.host).toBe('https://api.example.com');
    });
  });

  describe('validateApiEnvironment', () => {
    it('should validate correct configuration', () => {
      process.env.NEXT_PUBLIC_API_HOST = 'https://api.example.com';
      process.env.NEXT_PUBLIC_API_VERSION = 'v1';
      process.env.NODE_ENV = 'production';

      const validation = validateApiEnvironment();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid URL format', () => {
      process.env.NEXT_PUBLIC_API_HOST = 'not-a-valid-url';
      delete process.env.NEXT_PUBLIC_API_URL;

      const validation = validateApiEnvironment();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid API URL format: not-a-valid-url/api/v1');
    });

    it('should warn about HTTP in production', () => {
      process.env.NEXT_PUBLIC_API_HOST = 'http://api.example.com';
      process.env.NODE_ENV = 'production';
      
      // Mock window.location for production detection
      Object.defineProperty(global, 'window', {
        value: { location: { hostname: 'app.example.com' } },
        writable: true,
      });

      const validation = validateApiEnvironment();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Production API should use HTTPS');
    });

    it('should warn about legacy environment variable usage', () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://legacy.example.com/api/v1';
      delete process.env.NEXT_PUBLIC_API_HOST;

      const validation = validateApiEnvironment();

      expect(validation.errors).toContain(
        'Using deprecated NEXT_PUBLIC_API_URL. Please migrate to new environment variables.'
      );
    });
  });

  describe('getApiEnvironment with caching', () => {
    it('should return cached configuration on subsequent calls', () => {
      process.env.NEXT_PUBLIC_API_HOST = 'https://api.example.com';

      const config1 = getApiEnvironment();
      const config2 = getApiEnvironment();

      expect(config1).toBe(config2); // Same reference
    });

    it('should return new configuration after cache clear', () => {
      process.env.NEXT_PUBLIC_API_HOST = 'https://api.example.com';

      const config1 = getApiEnvironment();
      
      clearEnvironmentCache();
      process.env.NEXT_PUBLIC_API_HOST = 'https://new-api.example.com';
      
      const config2 = getApiEnvironment();

      expect(config1).not.toBe(config2);
      expect(config2.host).toBe('https://new-api.example.com');
    });
  });
});