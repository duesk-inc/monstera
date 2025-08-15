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
  // 後方互換性のため一時的に保持（Phase 4で削除予定）
  roles?: string[];          // @deprecated
  default_role?: number;     // @deprecated
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
  // 後方互換性のため一時的に保持（Phase 4で削除予定）
  roles?: number[];          // @deprecated
  default_role?: number;     // @deprecated
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

// ========================================
// 以下の型はPhase 3で統合済みのため、Phase 4で削除予定
// ========================================

// @deprecated - Use User instead
export type SingleRoleUser = User;

// @deprecated - Use ApiUser instead
export type SingleRoleApiUser = ApiUser;

// @deprecated - Use LoginResponse instead
export type SingleRoleLoginResponse = LoginResponse;

// @deprecated - Use RefreshTokenResponse instead
export type SingleRoleRefreshTokenResponse = RefreshTokenResponse; 