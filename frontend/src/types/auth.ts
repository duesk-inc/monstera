// 認証関連の型定義

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
  role: string;              // 互換性のため残す（最高権限のロール）
  roles?: string[];          // 複数ロール対応（文字列配列）
  default_role?: number;     // デフォルトロール（1:super_admin, 2:admin, 3:manager, 4:employee）
  phone_number?: string | null;
}

// APIレスポンスのユーザー情報
export interface ApiUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: number;              // APIは数値で返す
  roles?: number[];          // APIは数値配列で返す
  default_role?: number;
  phone_number?: string | null;
  // その他のフィールド
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ログイン成功時のレスポンス
export interface LoginResponse {
  user: ApiUser;             // APIはApiUser型で返す
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
  user?: ApiUser;            // APIはApiUser型で返す
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