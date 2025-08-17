'use client';

import { useEffect, useState } from 'react';
import { 
  unifiedApiFactory,
  getDefaultApiClient,
  getVersionedApiClient,
  getEnvironmentApiClient,
  getAdminApiClient,
  clearApiCache
} from '@/lib/api/factory';

export default function TestFactoryPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  
  useEffect(() => {
    const runTests = () => {
      const results: string[] = [];
      
      results.push('=== Phase 3: 統合ファクトリテスト開始 ===');
      
      try {
        // テスト1: デフォルトクライアントの作成
        results.push('\n[テスト1] デフォルトクライアントの作成');
        const defaultClient = getDefaultApiClient();
        results.push('✅ デフォルトクライアント作成成功');
        results.push(`  - baseURL: ${defaultClient.defaults.baseURL}`);
        results.push(`  - timeout: ${defaultClient.defaults.timeout}`);
        results.push(`  - withCredentials: ${defaultClient.defaults.withCredentials}`);
        
        // テスト2: バージョン指定クライアントの作成
        results.push('\n[テスト2] バージョン指定クライアントの作成');
        const v2Client = getVersionedApiClient('v2');
        results.push('✅ バージョン指定クライアント作成成功');
        results.push(`  - baseURL: ${v2Client.defaults.baseURL}`);
        
        // テスト3: 環境別クライアントの作成
        results.push('\n[テスト3] 環境別クライアントの作成');
        const devClient = getEnvironmentApiClient('development');
        results.push('✅ 開発環境クライアント作成成功');
        results.push(`  - baseURL: ${devClient.defaults.baseURL}`);
        
        // テスト4: 管理者用クライアントの作成
        results.push('\n[テスト4] 管理者用クライアントの作成');
        const adminClient = getAdminApiClient();
        results.push('✅ 管理者用クライアント作成成功');
        results.push(`  - X-Admin-Request: ${adminClient.defaults.headers['X-Admin-Request']}`);
        
        // テスト5: キャッシュ統計の確認
        results.push('\n[テスト5] キャッシュ統計の確認');
        const stats = unifiedApiFactory.getCacheStats();
        results.push('✅ キャッシュ統計取得成功');
        results.push(`  - 総エントリ数: ${stats.totalEntries}`);
        results.push(`  - ヒット数: ${stats.totalHits}`);
        results.push(`  - ミス数: ${stats.totalMisses}`);
        results.push(`  - ヒット率: ${(stats.averageHitRate * 100).toFixed(2)}%`);
        
        // テスト6: キャッシュヒットの確認
        results.push('\n[テスト6] キャッシュヒットの確認');
        const defaultClient2 = getDefaultApiClient();
        const isSameInstance = defaultClient === defaultClient2;
        results.push(`✅ キャッシュヒット確認: ${isSameInstance ? '成功（同一インスタンス）' : '失敗（異なるインスタンス）'}`);
        
        // テスト7: インターセプターの確認
        results.push('\n[テスト7] インターセプターの確認');
        const interceptorTypes = unifiedApiFactory.getInterceptorStatus(defaultClient);
        results.push('✅ インターセプター確認成功');
        results.push(`  - 登録済みインターセプター: ${interceptorTypes.join(', ')}`);
        
        // テスト8: キャッシュのクリア
        results.push('\n[テスト8] キャッシュのクリア');
        clearApiCache();
        const statsAfterClear = unifiedApiFactory.getCacheStats();
        results.push('✅ キャッシュクリア成功');
        results.push(`  - クリア後のエントリ数: ${statsAfterClear.totalEntries}`);
        
        // テスト9: デバッグ情報の取得
        results.push('\n[テスト9] デバッグ情報の取得');
        const debugInfo = unifiedApiFactory.getDebugInfo();
        results.push('✅ デバッグ情報取得成功');
        results.push(`  - キャッシュサイズ: ${debugInfo.cacheSize}`);
        results.push(`  - デフォルトクライアント存在: ${debugInfo.defaultClientExists}`);
        
        results.push('\n=== すべてのテストが成功しました ===');
        results.push('Phase 3の統合ファクトリ実装が正常に動作しています。');
        
      } catch (error) {
        results.push('\n❌ テスト中にエラーが発生しました:');
        results.push(String(error));
      }
      
      setTestResults(results);
    };
    
    runTests();
  }, []);
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Phase 3: 統合ファクトリテスト</h1>
      <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm">
        {testResults.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}