/**
 * Cognito認証対応のAxiosクライアント
 * APIクライアントファクトリを使用した統一的な実装
 */
import { apiClient } from '@/lib/api/client';

// APIクライアントファクトリから取得したデフォルトクライアントをエクスポート
export { apiClient };

// デフォルトエクスポートも提供（既存コードとの互換性のため）
export default apiClient;