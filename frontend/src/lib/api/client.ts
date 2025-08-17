/**
 * APIクライアント
 * 統合ファクトリへの直接エクスポート
 */

export {
  // 主要なエクスポート
  unifiedApiFactory as apiClientFactory,
  createUnifiedClient as createApiClient,
  getDefaultApiClient,
  getAuthenticatedApiClient,
  getAdminApiClient,
  getVersionedApiClient,
  getEnvironmentApiClient,
  clearApiCache as clearApiClientCache,
  
  // 型定義
  type UnifiedApiConfig as ApiClientConfig
} from './factory';

// デフォルトクライアント
import { getDefaultApiClient } from './factory';
export const apiClient = getDefaultApiClient();

// デフォルトエクスポート
export default apiClient;