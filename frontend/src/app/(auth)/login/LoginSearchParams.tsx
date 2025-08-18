'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

interface LoginSearchParamsProps {
  onError: (message: string) => void;
  onRedirect: (path: string) => void;
}

/**
 * ログインページのURLパラメータを処理するコンポーネント
 * Suspenseでラップされることを前提としている
 */
export function LoginSearchParams({ onError, onRedirect }: LoginSearchParamsProps) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const redirectParam = searchParams.get('redirect');
    
    if (errorParam === 'unauthorized') {
      onError('認証が必要です。ログインしてください。');
    } else if (errorParam === 'session_expired') {
      onError('セッションが期限切れです。再度ログインしてください。');
    }
    
    if (redirectParam) {
      onRedirect(decodeURIComponent(redirectParam));
    }
  }, [searchParams, onError, onRedirect]);
  
  return null;
}