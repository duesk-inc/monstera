import { useEffect, useRef, DependencyList } from 'react';
import { isAbortError } from '@/lib/api/error';

interface AbortableEffectOptions {
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: AbortableEffectOptions = {
  retryCount: 3,
  retryDelay: 1000,
  timeout: 20000,
};

/**
 * リトライ可能なエラーかどうかを判定
 */
const isRetryableError = (error: unknown): boolean => {
  if (error && typeof error === 'object') {
    const errorObj = error as { 
      code?: string; 
      message?: string; 
      response?: { status?: number } 
    };
    
    // ネットワークエラー
    if (errorObj.code === 'NETWORK_ERROR' || errorObj.code === 'ECONNREFUSED') {
      return true;
    }
    // タイムアウトエラー
    if (errorObj.code === 'ECONNABORTED' || errorObj.message?.includes('timeout')) {
      return true;
    }
    // 5xx サーバーエラー
    if (errorObj.response?.status && errorObj.response.status >= 500) {
      return true;
    }
  }
  return false;
};

/**
 * AbortControllerを使用したuseEffectのラッパーフック
 * @param effect 実行する非同期関数
 * @param deps 依存配列
 * @param options リトライ設定等のオプション
 */
export const useAbortableEffect = (
  effect: (signal: AbortSignal) => Promise<void>,
  deps: DependencyList,
  options: AbortableEffectOptions = {}
) => {
  const { retryCount, retryDelay } = { ...DEFAULT_OPTIONS, ...options };
  const controllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const executeEffect = async () => {
      // 前回のコントローラーをクリーンアップ
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      // 前回のリトライタイマーをクリーンアップ
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // 新しいコントローラーを作成
      controllerRef.current = new AbortController();
      let currentRetry = 0;

      const tryEffect = async (): Promise<void> => {
        try {
          if (controllerRef.current?.signal.aborted) {
            return;
          }
          await effect(controllerRef.current!.signal);
        } catch (err) {
          // Abort関連のエラーは正常な中断なので無視
          if (isAbortError(err)) {
            return;
          }

          // リトライ条件: 最大リトライ回数に達していない かつ リトライ可能なエラー
          if (currentRetry < retryCount! && isRetryableError(err)) {
            currentRetry++;
            console.log(`Retrying operation (${currentRetry}/${retryCount})...`);
            
            // 前回のリトライタイマーをクリア
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
            }
            
            // 指数バックオフでリトライ
            const delay = retryDelay! * Math.pow(2, currentRetry - 1);
            retryTimeoutRef.current = setTimeout(() => {
              if (!controllerRef.current?.signal.aborted) {
                tryEffect();
              }
            }, delay);
          } else {
            throw err;
          }
        }
      };

      await tryEffect();
    };

    executeEffect();

    return () => {
      // クリーンアップ時に実行中のリクエストとタイマーをキャンセル
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, deps);
}; 