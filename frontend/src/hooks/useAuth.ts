import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  isAuthenticated, 
  isTokenValid,
  setAuthState,
  getAuthState,
  setUser as setLocalUser, 
  getUser,
  clearAllAuthData,
  convertToLocalUser
} from '@/utils/auth';
import { User, LoginRequest } from '@/types/auth';
import { login as apiLogin, logout as apiLogout } from '@/lib/api/auth';
import { DebugLogger } from '@/lib/debug/logger';
import { useActiveRole } from '@/context/ActiveRoleContext';

// ログイン結果の型定義
interface LoginResult {
  success: boolean;
  redirectTo?: string;
}

// デバッグモード
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// デバッグログ
const debugLog = (...args: unknown[]) => {
  if (DEBUG_MODE) {
    DebugLogger.info({
      category: '認証',
      operation: 'ログ'
    }, args.join(' '));
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const { initializeActiveRole } = useActiveRole();
  
  // セッションタイムアウトのチェックと更新
  useEffect(() => {
    // 認証状態をチェックして初期化
    const checkAuthState = () => {
      const isUserAuthenticated = isAuthenticated();
      const isValid = isTokenValid();
      
      debugLog('認証状態チェック:', { 
        isAuthenticated: isUserAuthenticated, 
        isTokenValid: isValid
      });
      
      // 認証状態を更新
      setAuthenticated(isUserAuthenticated && isValid);
      
      // ユーザー情報を取得
      if (isUserAuthenticated && isValid) {
        const userData = getUser();
        if (userData) {
          const userObj = {
            id: userData.id,
            email: userData.email,
            first_name: userData.firstName || '',
            last_name: userData.lastName || '',
            role: userData.role || 'employee',
            roles: userData.roles,
            phone_number: userData.phoneNumber || ''
          };
          
          setUser(userObj);
          
          // ActiveRoleProviderを初期化
          if (userData.roles && userData.roles.length > 0) {
            initializeActiveRole(userData.roles, userData.defaultRole);
          }
        } else {
          // ユーザー情報がない場合は認証状態をクリア
          debugLog('認証状態の不整合: 認証状態あり、ユーザー情報なし');
          clearAllAuthData();
          setAuthenticated(false);
          setUser(null);
        }
      } else {
        // 認証されていない場合はユーザー情報をクリア
        setUser(null);
      }
    };
    
    // 初期チェック
    checkAuthState();
    
    // 定期的に認証状態をチェック（1分ごと）
    const intervalId = setInterval(() => {
      const authState = getAuthState();
      
      // 認証状態があり、有効期限を過ぎている場合
      if (authState && authState.authenticated && Date.now() >= authState.expires) {
        debugLog('セッションタイムアウト検出');
        
        // 認証状態をクリア
        clearAllAuthData();
        setAuthenticated(false);
        setUser(null);
        
        // タイムアウトメッセージを表示
        const authErrorEvent = new CustomEvent('auth-error', {
          detail: { message: 'セッションがタイムアウトしました。再度ログインしてください。' }
        });
        window.dispatchEvent(authErrorEvent);
        
        // ログイン画面にリダイレクト
        router.push('/login?force=true&timeout=true');
      } else {
        // 通常の認証状態チェック
        checkAuthState();
      }
    }, 60000); // 1分ごとにチェック
    
    // ストレージイベントのリスナー（別タブでのログイン/ログアウトを検知）
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'monstera_auth_state' || event.key === 'monstera_user') {
        debugLog('ストレージ変更検出:', event.key);
        checkAuthState();
      }
    };
    
    // ストレージイベントのリスナーを登録
    window.addEventListener('storage', handleStorageChange);
    
    // クリーンアップ
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ログイン関数
  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Cognito認証APIを使用
      debugLog('ログインリクエスト送信 (Cognito):', credentials.email);
      const response = await apiLogin(credentials);
      
      // ユーザー情報をステートに設定
      setUser(response.user);
      setAuthenticated(true);
      
      // ローカルストレージにユーザー情報と認証状態を保存
      const localUser = convertToLocalUser(response.user);
      setLocalUser(localUser);
      setAuthState(true);
      
      // ActiveRoleProviderを初期化
      // convertToLocalUserで変換されたユーザー情報を取得
      const convertedUser = getUser();
      if (convertedUser && convertedUser.roles && convertedUser.roles.length > 0) {
        initializeActiveRole(convertedUser.roles, response.user.default_role);
      }
      
      debugLog('ログイン成功:', response.user.email);
      
      // リダイレクト先が指定されている場合はそれを返す
      if (response.redirect_to) {
        return { success: true, redirectTo: response.redirect_to };
      }
      
      return { success: true };
    } catch (err) {
      DebugLogger.apiError({
        category: '認証',
        operation: 'ログイン'
      }, {
        error: err
      });
      
      // エラーメッセージを設定
      if (err && typeof err === 'object' && 'error' in err) {
        setError(String(err.error));
      } else {
        setError('サーバーエラーが発生しました');
      }
      
      return { success: false };
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // ログアウト関数
  const logout = useCallback(async () => {
    setIsLoading(true);
    debugLog('ログアウト処理を開始します (Cognito)');
    
    try {
      // Cognito認証APIを使用
      await apiLogout();
      
      debugLog('ログアウトリクエスト成功');
      
      // ユーザー情報と認証状態をクリア
      setUser(null);
      setAuthenticated(false);
      clearAllAuthData();
      
      // ログインページにリダイレクト (forceパラメータを明示的に追加)
      router.push('/login?force=true');
    } catch (err) {
      DebugLogger.apiError({
        category: '認証',
        operation: 'ログアウト'
      }, {
        error: err
      });
      
      // エラーメッセージを設定
      if (err && typeof err === 'object' && 'error' in err) {
        setError(String(err.error));
      } else {
        setError('ログアウト中にエラーが発生しました');
      }
      
      // エラーが発生してもユーザー情報と認証状態をクリア
      setUser(null);
      setAuthenticated(false);
      clearAllAuthData();
      
      // ログインページにリダイレクト (forceパラメータを明示的に追加)
      router.push('/login?force=true');
    } finally {
      setIsLoading(false);
    }
  }, [router]);
  
  // 初期化時にユーザー情報と認証状態の整合性を確保
  const initializeAuth = useCallback(() => {
    setIsLoading(true);
    
    debugLog('認証初期化開始');
    
    // 認証状態を確認
    const isUserAuthenticated = isAuthenticated();
    const isValid = isTokenValid();
    
    debugLog('認証状態初期化:', { 
      isAuthenticated: isUserAuthenticated, 
      isTokenValid: isValid
    });
    
    // 認証状態を更新
    setAuthenticated(isUserAuthenticated && isValid);
    
    // 認証されていて、トークンが有効な場合はユーザー情報も取得
    if (isUserAuthenticated && isValid) {
      const localUser = getUser();
      
      if (localUser) {
        // ユーザー情報をステートに設定
        // このとき、APIの型定義（first_name, last_name）に合わせて変換
        const formattedUser = {
          id: localUser.id,
          email: localUser.email,
          first_name: localUser.firstName || '',
          last_name: localUser.lastName || '',
          role: localUser.role || 'employee',
          roles: localUser.roles,
          phone_number: localUser.phoneNumber || '' // 型定義に合わせて修正
        };
        
        setUser(formattedUser);
        
        // ActiveRoleProviderを初期化
        if (formattedUser.roles) {
          initializeActiveRole(formattedUser.roles, localUser.defaultRole);
        }
      } else {
        // 認証状態があるのにユーザー情報がない場合は矛盾しているので認証状態をクリア
        debugLog('認証状態あり、ユーザー情報なし - 認証状態をクリア');
        clearAllAuthData();
        setAuthenticated(false);
      }
    } else if (!isValid && isUserAuthenticated) {
      // トークンが無効なのに認証状態がある場合はクリア
      debugLog('認証状態が無効 - 認証状態をクリア');
      clearAllAuthData();
      setAuthenticated(false);
      setUser(null);
    } else {
      // 認証されていない場合はユーザー情報もクリア
      debugLog('認証されていない - ユーザー情報をクリア');
      setUser(null);
    }
    
    debugLog('認証初期化完了');
    
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return {
    user,
    isLoading,
    error,
    login,
    logout,
    initializeAuth,
    isAuthenticated: authenticated,
  };
}; 