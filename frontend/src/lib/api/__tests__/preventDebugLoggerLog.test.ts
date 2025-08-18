/**
 * DebugLogger.log()メソッドが使用できないことを確認するテスト
 * Phase 3の予防措置が正しく機能していることを検証
 */

import { DebugLogger } from '@/lib/debug/logger';

describe('DebugLogger Prevention Measures', () => {
  describe('TypeScript型定義による保護', () => {
    it('should not have log method at runtime', () => {
      // ランタイムでlogメソッドが存在しないことを確認
      const logger = DebugLogger as any;
      expect(logger.log).toBeUndefined();
    });

    it('should have all valid methods defined', () => {
      // 正しいメソッドが全て定義されていることを確認
      expect(typeof DebugLogger.info).toBe('function');
      expect(typeof DebugLogger.debug).toBe('function');
      expect(typeof DebugLogger.error).toBe('function');
      expect(typeof DebugLogger.apiStart).toBe('function');
      expect(typeof DebugLogger.apiSuccess).toBe('function');
      expect(typeof DebugLogger.apiError).toBe('function');
      expect(typeof DebugLogger.dataConversion).toBe('function');
      expect(typeof DebugLogger.validation).toBe('function');
      expect(typeof DebugLogger.apiRequest).toBe('function');
    });
  });

  describe('正しいメソッドの使用例', () => {
    beforeEach(() => {
      // console.logをモック
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should use info method correctly', () => {
      expect(() => {
        DebugLogger.info(
          { category: 'TEST', operation: 'TestOperation' },
          'This is a test message',
          { testData: 'value' }
        );
      }).not.toThrow();
    });

    it('should use debug method correctly', () => {
      expect(() => {
        DebugLogger.debug(
          { category: 'TEST', operation: 'TestDebug' },
          'Debug message',
          { debugInfo: 'test' }
        );
      }).not.toThrow();
    });

    it('should use error method correctly', () => {
      expect(() => {
        DebugLogger.error(
          'TEST',
          'Error occurred',
          new Error('Test error')
        );
      }).not.toThrow();
    });

    it('should use apiStart method correctly', () => {
      expect(() => {
        DebugLogger.apiStart(
          { 
            category: 'API', 
            operation: 'TestAPI',
            description: 'Testing API start'
          },
          { 
            url: '/test',
            method: 'GET'
          }
        );
      }).not.toThrow();
    });

    it('should use apiSuccess method correctly', () => {
      expect(() => {
        DebugLogger.apiSuccess(
          { category: 'API', operation: 'TestAPI' },
          { 
            status: 200,
            responseData: { success: true }
          }
        );
      }).not.toThrow();
    });

    it('should use apiError method correctly', () => {
      expect(() => {
        DebugLogger.apiError(
          { category: 'API', operation: 'TestAPI' },
          { 
            error: new Error('API failed'),
            status: 500
          }
        );
      }).not.toThrow();
    });
  });

  describe('誤った使用方法の検出', () => {
    it('should fail if trying to call non-existent log method', () => {
      const logger = DebugLogger as any;
      
      // logメソッドを呼び出そうとするとエラーになることを確認
      if (logger.log) {
        expect(() => {
          logger.log('TEST', 'This should not work');
        }).toThrow();
      } else {
        // logメソッドが存在しない場合（期待される動作）
        expect(logger.log).toBeUndefined();
      }
    });

    it('should demonstrate correct migration from log to info', () => {
      // 以前の間違った使用方法（コメントアウト）
      // DebugLogger.log('CATEGORY', 'message', data);
      
      // 正しい使用方法
      expect(() => {
        DebugLogger.info(
          { category: 'CATEGORY', operation: 'Operation' },
          'message',
          { data: 'value' }
        );
      }).not.toThrow();
    });
  });

  describe('環境による動作確認', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should output logs in development environment', () => {
      process.env.NODE_ENV = 'development';
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // privateフィールドを強制的に設定（テスト用）
      (DebugLogger as any).isDevelopment = true;
      
      DebugLogger.info(
        { category: 'TEST', operation: 'Test' },
        'Test message'
      );
      
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should not output logs in production environment', () => {
      process.env.NODE_ENV = 'production';
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // privateフィールドを強制的に設定（テスト用）
      (DebugLogger as any).isDevelopment = false;
      
      DebugLogger.info(
        { category: 'TEST', operation: 'Test' },
        'Test message'
      );
      
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});