/**
 * API修正のテストスクリプト
 * getAuthClient()がキャッシュされたインスタンスを返すことを確認
 */

import { getAuthClient } from '@/lib/api';
import { saveWeeklyReportAsDraft, getCurrentWeeklyReport } from '@/lib/api/weeklyReport';

async function testApiClientFix() {
  console.log('=== API Client Fix Test ===');
  
  // Test 1: getAuthClient が同じインスタンスを返すことを確認
  console.log('\n[Test 1] getAuthClient instance check');
  const client1 = getAuthClient();
  const client2 = getAuthClient();
  const client3 = getAuthClient();
  
  if (client1 === client2 && client2 === client3) {
    console.log('✅ PASS: getAuthClient returns the same cached instance');
  } else {
    console.log('❌ FAIL: getAuthClient creates new instances');
  }
  
  // Test 2: インターセプターの数を確認（重複していないか）
  console.log('\n[Test 2] Interceptor count check');
  const client = getAuthClient();
  const requestInterceptors = (client.interceptors.request as any).handlers?.length || 0;
  const responseInterceptors = (client.interceptors.response as any).handlers?.length || 0;
  
  console.log(`Request interceptors: ${requestInterceptors}`);
  console.log(`Response interceptors: ${responseInterceptors}`);
  
  // 通常は各2-3個程度が適切
  if (requestInterceptors <= 5 && responseInterceptors <= 5) {
    console.log('✅ PASS: Interceptor count is reasonable');
  } else {
    console.log('⚠️ WARNING: Too many interceptors registered');
  }
  
  // Test 3: API呼び出しが動作することを確認
  console.log('\n[Test 3] API call test');
  try {
    // 現在の週報を取得（401エラーは想定内）
    const result = await getCurrentWeeklyReport();
    console.log('✅ API call successful:', result ? 'Data received' : 'No data');
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('✅ PASS: API call works (401 auth required is expected)');
    } else {
      console.log('❌ FAIL: Unexpected error:', error.message);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

// テスト実行
if (typeof window !== 'undefined') {
  // ブラウザ環境での実行
  (window as any).testApiClientFix = testApiClientFix;
  console.log('Test function available: window.testApiClientFix()');
} else {
  // Node.js環境での実行
  testApiClientFix();
}

export default testApiClientFix;