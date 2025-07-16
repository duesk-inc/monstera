/**
 * グローバルティアダウン
 * 全テスト実行後に一度だけ実行される
 */
async function globalTeardown() {
  console.log('🧹 Starting E2E test environment cleanup...');
  
  try {
    // 必要に応じて、テストデータのクリーンアップやリソースの解放を行う
    // 例: テスト用データベースのリセット、一時ファイルの削除など
    
    console.log('✅ E2E test environment cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
    // ティアダウンでのエラーは致命的ではないため、ログ出力のみ
  }
}

export default globalTeardown;