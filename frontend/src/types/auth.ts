// 認証関連の型定義
// Phase 3: 単一ロールシステムに統一

// ログイン時のリクエスト
export interface LoginRequest {
  email: string;
  password: string;
}

// ユーザー情報（フロントエンド内部で使用）
export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: number;              // 数値型のロール (1-4)
  phone_number?: string | null;
}

// APIレスポンスのユーザー情報
export interface ApiUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: number;              // 数値型のロール (1-4)
  phone_number?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ログイン成功時のレスポンス
export interface LoginResponse {
  user: ApiUser;
  access_token: string;
  refresh_token?: string;
  message: string;
  redirect_to?: string;
}

// リフレッシュトークンのリクエスト
export interface RefreshTokenRequest {
  refresh_token?: string;
}

// リフレッシュトークンのレスポンス
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
  user?: ApiUser;
  message?: string;
}

// エラーレスポンス
export interface ErrorResponse {
  error: string;
  status?: number;
}

// ログアウトレスポンス
export interface LogoutResponse {
  message: string;
}

 