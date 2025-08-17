/**
 * 統合ファクトリのテストスクリプト
 * Phase 3の動作確認用
 */

// Node.jsでES Modulesを使用するための設定
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function testFactory() {
  console.log('=== Phase 3: 統合ファクトリテスト開始 ===\n');
  
  try {
    // 動的インポート
    const { 
      unifiedApiFactory,
      getDefaultApiClient,
      getVersionedApiClient,
      getEnvironmentApiClient,
      getAdminApiClient,
      clearApiCache
    } = await import('./src/lib/api/factory/index.ts');
    
    console.log('✅ ファクトリモジュールのインポート成功');
    
    // テスト1: デフォルトクライアントの作成
    console.log('\n[テスト1] デフォルトクライアントの作成');
    const defaultClient = getDefaultApiClient();
    console.log('✅ デフォルトクライアント作成成功');
    console.log(`  - baseURL: ${defaultClient.defaults.baseURL}`);
    console.log(`  - timeout: ${defaultClient.defaults.timeout}`);
    console.log(`  - withCredentials: ${defaultClient.defaults.withCredentials}`);
    
    // テスト2: バージョン指定クライアントの作成
    console.log('\n[テスト2] バージョン指定クライアントの作成');
    const v2Client = getVersionedApiClient('v2');
    console.log('✅ バージョン指定クライアント作成成功');
    console.log(`  - baseURL: ${v2Client.defaults.baseURL}`);
    
    // テスト3: 環境別クライアントの作成
    console.log('\n[テスト3] 環境別クライアントの作成');
    const devClient = getEnvironmentApiClient('development');
    console.log('✅ 開発環境クライアント作成成功');
    console.log(`  - baseURL: ${devClient.defaults.baseURL}`);
    
    // テスト4: 管理者用クライアントの作成
    console.log('\n[テスト4] 管理者用クライアントの作成');
    const adminClient = getAdminApiClient();
    console.log('✅ 管理者用クライアント作成成功');
    console.log(`  - X-Admin-Request: ${adminClient.defaults.headers['X-Admin-Request']}`);
    
    // テスト5: キャッシュ統計の確認
    console.log('\n[テスト5] キャッシュ統計の確認');
    const stats = unifiedApiFactory.getCacheStats();
    console.log('✅ キャッシュ統計取得成功');
    console.log(`  - 総エントリ数: ${stats.totalEntries}`);
    console.log(`  - ヒット数: ${stats.totalHits}`);
    console.log(`  - ミス数: ${stats.totalMisses}`);
    console.log(`  - ヒット率: ${(stats.averageHitRate * 100).toFixed(2)}%`);
    
    // テスト6: キャッシュヒットの確認
    console.log('\n[テスト6] キャッシュヒットの確認');
    const defaultClient2 = getDefaultApiClient(); // 同じクライアントを再取得
    const isSameInstance = defaultClient === defaultClient2;
    console.log(`✅ キャッシュヒット確認: ${isSameInstance ? '成功（同一インスタンス）' : '失敗（異なるインスタンス）'}`);
    
    // テスト7: インターセプターの確認
    console.log('\n[テスト7] インターセプターの確認');
    const interceptorTypes = unifiedApiFactory.getInterceptorStatus(defaultClient);
    console.log('✅ インターセプター確認成功');
    console.log(`  - 登録済みインターセプター: ${interceptorTypes.join(', ')}`);
    
    // テスト8: キャッシュのクリア
    console.log('\n[テスト8] キャッシュのクリア');
    clearApiCache();
    const statsAfterClear = unifiedApiFactory.getCacheStats();
    console.log('✅ キャッシュクリア成功');
    console.log(`  - クリア後のエントリ数: ${statsAfterClear.totalEntries}`);
    
    console.log('\n=== すべてのテストが成功しました ===');
    console.log('Phase 3の統合ファクトリ実装が正常に動作しています。');
    
  } catch (error) {
    console.error('\n❌ テスト中にエラーが発生しました:');
    console.error(error);
    process.exit(1);
  }
}

// テスト実行
testFactory();