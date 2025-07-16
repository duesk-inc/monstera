import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Cognito認証関連のモックハンドラー
export const authHandlers = [
  // CognitoログインAPI
  http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
    const body = await request.json() as any;
    const { email, password } = body;
    
    // テスト用の成功ケース
    if (email === 'test@duesk.co.jp' && password === 'password123') {
      return HttpResponse.json({
        message: 'Cognitoログイン成功',
        access_token: 'mock-cognito-access-token',
        user: {
          id: 'test-user-id',
          email: 'test@duesk.co.jp',
          first_name: 'Test',
          last_name: 'User',
          role: 'employee',
          department: '開発部',
          roles: [4], // employee
        },
        redirect_to: '/dashboard',
      }, { status: 200 });
    }
    
    // 管理者ユーザーのテストケース
    if (email === 'admin@duesk.co.jp' && password === 'admin123') {
      return HttpResponse.json({
        message: 'Cognitoログイン成功',
        access_token: 'mock-cognito-admin-token',
        user: {
          id: 'admin-user-id',
          email: 'admin@duesk.co.jp',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          department: '管理部',
          roles: [2], // admin
        },
        redirect_to: '/admin/dashboard',
      }, { status: 200 });
    }
    
    // 認証失敗のテストケース
    return HttpResponse.json({
      error: 'メールアドレスまたはパスワードが正しくありません',
    }, { status: 401 });
  }),
  
  // Cognito現在のユーザー情報取得API
  http.get(`${API_BASE_URL}/api/v1/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    // 有効なCognitoトークンのテストケース
    if (authHeader === 'Bearer mock-cognito-access-token') {
      return HttpResponse.json({
        user: {
          id: 'test-user-id',
          email: 'test@duesk.co.jp',
          first_name: 'Test',
          last_name: 'User',
          role: 'employee',
          department: '開発部',
          roles: [4],
        },
      }, { status: 200 });
    }
    
    // Cognito認証失敗
    return HttpResponse.json({
      error: 'Cognito認証が必要です',
    }, { status: 401 });
  }),
  
  // CognitoログアウトAPI
  http.post(`${API_BASE_URL}/api/v1/auth/logout`, () => {
    return HttpResponse.json({
      message: 'Cognitoログアウト成功',
    }, { status: 200 });
  }),
  
  // CognitoトークンリフレッシュAPI
  http.post(`${API_BASE_URL}/api/v1/auth/refresh`, ({ request }) => {
    const cookies = request.headers.get('Cookie');
    
    // Cognitoリフレッシュトークンのチェック（セキュアなクッキー経由）
    if (cookies && cookies.includes('cognito-refresh-token')) {
      return HttpResponse.json({
        message: 'Cognitoトークンリフレッシュ成功',
        access_token: 'new-mock-cognito-access-token',
        user: {
          id: 'test-user-id',
          email: 'test@duesk.co.jp',
          first_name: 'Test',
          last_name: 'User',
          role: 'employee',
          department: '開発部',
          roles: [4],
        },
      }, { status: 200 });
    }
    
    return HttpResponse.json({
      error: 'Cognitoリフレッシュトークンが無効です',
    }, { status: 401 });
  }),
];

// Cognitoテスト用ヘルパー関数
export const createCognitoSuccessLoginHandler = (email: string, userData: any) => {
  return http.post(`${API_BASE_URL}/api/v1/auth/login`, async () => {
    return HttpResponse.json({
      message: 'Cognitoログイン成功',
      access_token: 'mock-cognito-access-token',
      user: userData,
      redirect_to: '/dashboard',
    }, { status: 200 });
  });
};

export const createCognitoFailedLoginHandler = (errorMessage: string) => {
  return http.post(`${API_BASE_URL}/api/v1/auth/login`, async () => {
    return HttpResponse.json({
      error: errorMessage,
    }, { status: 401 });
  });
};

export const createCognitoUnauthorizedHandler = () => {
  return http.get(`${API_BASE_URL}/api/v1/auth/me`, () => {
    return HttpResponse.json({
      error: 'Cognito認証が必要です',
    }, { status: 401 });
  });
};

export const createCognitoServerErrorHandler = () => {
  return http.post(`${API_BASE_URL}/api/v1/auth/login`, async () => {
    return HttpResponse.json({
      error: 'Cognitoサーバーエラーが発生しました',
    }, { status: 500 });
  });
};
