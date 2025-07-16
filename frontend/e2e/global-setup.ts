import { chromium, FullConfig } from '@playwright/test';

/**
 * グローバルセットアップ
 * 全テスト実行前に一度だけ実行される
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test environment setup...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // アプリケーションの起動確認
    console.log('📡 Checking application availability...');
    await page.goto('http://localhost:3000');
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('✅ Application is running and accessible');

    // 必要に応じて、テストデータの準備やDB初期化などを行う
    // 例: 管理者ユーザーの作成、テスト用エンジニアデータの投入など
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ E2E test environment setup completed');
}

export default globalSetup;