import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES, PUBLIC_PATHS } from '@/constants/routes';
import { AUTH_COOKIES } from '@/constants/auth';

// デバッグモード
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// デバッグログ
const debugLog = (...messages: unknown[]) => {
  if (DEBUG_MODE) {
    console.log('[Middleware]', ...messages);
  }
};

// ログイン済みユーザーが不要なパス
const publicPaths = PUBLIC_PATHS;

/**
 * Cognitoトークンのフォーマットチェック
 * 単純な形式チェックのみを行い、署名検証はバックエンドのCognito検証に任せる
 */
const isValidCognitoTokenFormat = (token: string): boolean => {
  if (!token || token.trim() === '') {
    debugLog('Cognitoトークンが空です');
    return false;
  }
  
  try {
    // CognitoトークンはJWT形式で通常3つのパートに分かれている（header.payload.signature）
    const parts = token.split('.');
    if (parts.length !== 3) {
      debugLog('Cognitoトークンのセグメント数が不正:', parts.length);
      return false;
    }
    
    // 各パートが空でないことを確認
    const valid = parts.every(part => part.trim() !== '');
    if (!valid) {
      debugLog('Cognitoトークンのセグメントに空のものがあります');
    }
    return valid;
  } catch (e) {
    debugLog('Cognitoトークン検証エラー:', e);
    return false;
  }
};

/**
 * クッキーからCognitoトークンを抽出して有効性をチェック
 */
const getCognitoTokenFromCookies = (request: NextRequest): { token: string | null; isValid: boolean } => {
  const accessToken = request.cookies.get(AUTH_COOKIES.ACCESS_TOKEN)?.value || null;
  
  // トークンがない場合
  if (!accessToken) {
    debugLog('Cognitoアクセストークンがクッキーにありません');
    return { token: null, isValid: false };
  }
  
  // Cognitoトークン形式のチェック
  const isValid = isValidCognitoTokenFormat(accessToken);
  
  debugLog('CognitoCookieトークン検証:', { 
    hasToken: !!accessToken, 
    tokenLength: accessToken ? accessToken.length : 0,
    tokenPrefix: accessToken ? accessToken.substring(0, 10) + '...' : '',
    isValidFormat: isValid
  });
  
  return { token: accessToken, isValid };
};

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  debugLog('Request path:', pathname);
  
  // パスがpublicPathsのいずれかに一致するか確認
  const isPublicPath = publicPaths.some(path => 
    pathname.startsWith(path)
  );
  
  debugLog('Public path?', isPublicPath);
  
  // forceパラメータがある場合はリダイレクト処理をスキップ（ログアウト後のログイン画面表示用）
  const forceParam = searchParams.get('force');
  const hasForceParam = forceParam === 'true';
  
  debugLog('Has force parameter?', hasForceParam);
  
  // Cognito認証状態を確認（より厳密なチェック）
  const { token, isValid } = getCognitoTokenFromCookies(request);
  const hasValidToken = token !== null && isValid;
  
  debugLog('Cognito認証状態：', { hasToken: !!token, isValidToken: hasValidToken });
  
  // forceパラメータがある場合はリダイレクト処理をスキップ
  if (pathname === ROUTES.LOGIN && hasForceParam) {
    debugLog('Force parameter detected, skipping redirect');
    return NextResponse.next();
  }
  
  // 認証が必要なページにアクセスしようとしていて認証されていない場合
  if (!isPublicPath && !hasValidToken) {
    debugLog('Redirecting to login (auth required)');
    
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.LOGIN;
    
    // 元のURLをクエリパラメータとして保存
    url.searchParams.set('callbackUrl', pathname);
    
    return NextResponse.redirect(url);
  }
  
  // ログイン済みのユーザーがログインページにアクセスしようとした場合
  if (pathname === ROUTES.LOGIN && hasValidToken && !hasForceParam) {
    debugLog('Redirecting to dashboard (already authenticated)');
    
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.DASHBOARD;
    
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 