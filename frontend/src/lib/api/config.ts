/**
 * API設定とユーティリティ関数
 */

import { 
  apiClient as factoryApiClient, 
  createApiClient as factoryCreateApiClient 
} from '@/lib/api/client';

// APIベースURL（後方互換性のため維持）
// 新しい分離された環境変数を使用（後方互換性も維持）
const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
const LEGACY_URL = process.env.NEXT_PUBLIC_API_URL;

export const API_BASE_URL = LEGACY_URL || `${API_HOST}/api/${API_VERSION}`;

// API設定（後方互換性のため維持）
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * 認証ヘッダーを取得
 * クッキーベースの認証を使用しているため、通常は追加ヘッダーは不要
 * 必要に応じてBearerトークンなどを追加可能
 */
export const getAuthHeaders = () => {
  // クッキーベースの認証を使用しているため、特別なヘッダーは不要
  // 必要に応じて以下のようなコードを追加:
  // const token = localStorage.getItem('accessToken');
  // if (token) {
  //   return { Authorization: `Bearer ${token}` };
  // }
  return {};
};

/**
 * APIクライアントの作成（ファクトリを使用）
 */
export const createApiClient = () => {
  return factoryCreateApiClient(API_CONFIG);
};

// デフォルトのAPIクライアント（ファクトリから取得）
export const apiClient = factoryApiClient;

/**
 * APIエンドポイントのヘルパー関数
 */
export const endpoints = {
  // 認証
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    refresh: '/auth/refresh',
  },
  // ユーザー
  users: {
    list: '/users',
    get: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
  },
  // 経費承認者設定
  expenseApprovers: {
    list: '/expense-approvers',
    get: (id: string) => `/expense-approvers/${id}`,
    create: '/expense-approvers',
    update: (id: string) => `/expense-approvers/${id}`,
    delete: (id: string) => `/expense-approvers/${id}`,
  },
  // その他のエンドポイントは必要に応じて追加
};

export default apiClient;