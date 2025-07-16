'use client';

import { useEffect, useRef } from 'react';

interface UseAuthInitializerOptions {
  initializeAuth: () => void;
  user: unknown | null;
  debugMode?: boolean;
  retryDelay?: number;
}

export const useAuthInitializer = ({
  initializeAuth,
  user,
  debugMode = false,
  retryDelay,
}: UseAuthInitializerOptions) => {
  const initRef = useRef(false);

  const debugLog = (...args: unknown[]) => {
    if (debugMode) {
      console.log('[AuthInitializer]', ...args);
    }
  };

  useEffect(() => {
    if (!initRef.current) {
      debugLog('認証初期化を実行');
      initializeAuth();
      initRef.current = true;

      // リトライロジックが必要な場合
      if (retryDelay && !user) {
        const timer = setTimeout(() => {
          if (!user) {
            debugLog('ユーザー情報が未設定のため再初期化を実行');
            initializeAuth();
          }
        }, retryDelay);

        return () => clearTimeout(timer);
      }
    }
  }, [initializeAuth, user, retryDelay]);

  return { initialized: initRef.current };
};