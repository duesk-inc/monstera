import { useEffect, useRef, useCallback, useState } from 'react';

interface UseWebWorkerOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  terminateOnUnmount?: boolean;
}

interface UseWebWorkerReturn<T = any> {
  postMessage: (message: any) => void;
  terminate: () => void;
  isReady: boolean;
  error: Error | null;
  sendRequest: (type: string, data: any) => Promise<T>;
}

export function useWebWorker<T = any>(
  workerPath: string,
  options: UseWebWorkerOptions = {}
): UseWebWorkerReturn<T> {
  const { onMessage, onError, terminateOnUnmount = true } = options;
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pendingRequests = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map());

  // Worker の初期化
  useEffect(() => {
    try {
      // Dynamic import を使用して Worker を作成
      workerRef.current = new Worker(
        new URL(workerPath, import.meta.url),
        { type: 'module' }
      );

      // メッセージハンドラー
      workerRef.current.onmessage = (event) => {
        const { type, data, id, error: errorMessage } = event.data;

        // Worker 準備完了
        if (type === 'WORKER_READY') {
          setIsReady(true);
          return;
        }

        // エラーレスポンス
        if (type === 'ERROR') {
          const error = new Error(errorMessage || 'Worker error');
          setError(error);
          
          if (id && pendingRequests.current.has(id)) {
            const { reject } = pendingRequests.current.get(id)!;
            reject(error);
            pendingRequests.current.delete(id);
          }
          
          onError?.(error);
          return;
        }

        // 通常のレスポンス
        if (id && pendingRequests.current.has(id)) {
          const { resolve } = pendingRequests.current.get(id)!;
          resolve(data);
          pendingRequests.current.delete(id);
        }

        onMessage?.(event.data);
      };

      // エラーハンドラー
      workerRef.current.onerror = (event) => {
        const error = new Error(`Worker error: ${event.message}`);
        setError(error);
        onError?.(error);
      };

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create worker');
      setError(error);
      onError?.(error);
    }

    // クリーンアップ
    return () => {
      if (terminateOnUnmount && workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        setIsReady(false);
      }
    };
  }, [workerPath, onMessage, onError, terminateOnUnmount]);

  // メッセージ送信
  const postMessage = useCallback((message: any) => {
    if (!workerRef.current) {
      console.error('Worker is not initialized');
      return;
    }
    workerRef.current.postMessage(message);
  }, []);

  // Promise ベースのリクエスト送信
  const sendRequest = useCallback(
    <T = any>(type: string, data: any): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !isReady) {
          reject(new Error('Worker is not ready'));
          return;
        }

        const id = `${type}_${Date.now()}_${Math.random()}`;
        pendingRequests.current.set(id, { resolve, reject });

        workerRef.current.postMessage({
          type,
          data,
          id,
        });

        // タイムアウト設定（30秒）
        setTimeout(() => {
          if (pendingRequests.current.has(id)) {
            pendingRequests.current.delete(id);
            reject(new Error('Worker request timeout'));
          }
        }, 30000);
      });
    },
    [isReady]
  );

  // Worker の強制終了
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsReady(false);
      
      // 保留中のリクエストをすべて拒否
      pendingRequests.current.forEach(({ reject }) => {
        reject(new Error('Worker terminated'));
      });
      pendingRequests.current.clear();
    }
  }, []);

  return {
    postMessage,
    terminate,
    isReady,
    error,
    sendRequest,
  };
}