/**
 * DebugLoggerクラスのメソッド存在確認テスト
 * DebugLogger.log()メソッドが存在しないことを確認し、
 * 正しいメソッドが利用可能であることを検証する
 */

import { DebugLogger } from '@/lib/debug/logger';

describe('DebugLogger', () => {
  describe('メソッドの存在確認', () => {
    it('should have info method', () => {
      expect(DebugLogger.info).toBeDefined();
      expect(typeof DebugLogger.info).toBe('function');
    });

    it('should have debug method', () => {
      expect(DebugLogger.debug).toBeDefined();
      expect(typeof DebugLogger.debug).toBe('function');
    });

    it('should have error method', () => {
      expect(DebugLogger.error).toBeDefined();
      expect(typeof DebugLogger.error).toBe('function');
    });

    it('should have apiStart method', () => {
      expect(DebugLogger.apiStart).toBeDefined();
      expect(typeof DebugLogger.apiStart).toBe('function');
    });

    it('should have apiSuccess method', () => {
      expect(DebugLogger.apiSuccess).toBeDefined();
      expect(typeof DebugLogger.apiSuccess).toBe('function');
    });

    it('should have apiError method', () => {
      expect(DebugLogger.apiError).toBeDefined();
      expect(typeof DebugLogger.apiError).toBe('function');
    });

    it('should NOT have log method', () => {
      // TypeScriptの型チェックを回避するためにanyにキャスト
      const logger = DebugLogger as any;
      expect(logger.log).toBeUndefined();
    });
  });

  describe('メソッド呼び出しテスト', () => {
    // NODE_ENVをモック
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      // console.logをモック
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
      process.env.NODE_ENV = originalEnv;
    });

    it('should not throw error when calling info method', () => {
      expect(() => {
        DebugLogger.info(
          { category: 'TEST', operation: 'Test' },
          'Test message',
          { data: 'test' }
        );
      }).not.toThrow();
    });

    it('should not throw error when calling debug method', () => {
      expect(() => {
        DebugLogger.debug(
          { category: 'TEST', operation: 'Test' },
          'Test message',
          { data: 'test' }
        );
      }).not.toThrow();
    });

    it('should not throw error when calling error method', () => {
      expect(() => {
        DebugLogger.error('TEST', 'Test error', new Error('Test'));
      }).not.toThrow();
    });

    it('should throw error when trying to call non-existent log method', () => {
      const logger = DebugLogger as any;
      expect(() => {
        if (logger.log) {
          logger.log('TEST', 'This should not work');
        } else {
          throw new TypeError('DebugLogger.log is not a function');
        }
      }).toThrow(TypeError);
    });
  });
});