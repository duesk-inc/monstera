/**
 * Cognito認証対応のAxiosクライアント
 * 既存のAPIクライアントとの互換性を保ちつつ、Cognito認証に対応
 */
import { getAuthClient } from '@/lib/api/index';

// Cognito認証対応のAPIクライアントをエクスポート
export const apiClient = getAuthClient();

// デフォルトエクスポートも提供（既存コードとの互換性のため）
export default apiClient;