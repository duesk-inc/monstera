
// APIインポートパス統一テスト
import apiClient from '@/lib/api';
import { getAuthClient, handleApiError } from '@/lib/api';

export function testApiImport() {
  // APIクライアントの存在確認
  if (!apiClient) {
    throw new Error('apiClient is not defined');
  }
  
  // getAuthClient関数の存在確認
  if (typeof getAuthClient !== 'function') {
    throw new Error('getAuthClient is not a function');
  }
  
  // handleApiError関数の存在確認
  if (typeof handleApiError !== 'function') {
    throw new Error('handleApiError is not a function');
  }
  
  console.log('✅ すべてのインポートが正しく動作しています');
  return true;
}
