import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定ファイル
 * エンジニア管理システムのE2Eテスト用設定
 */
export default defineConfig({
  testDir: './e2e',
  /* 同時実行テスト数 */
  fullyParallel: true,
  /* CI環境でのfail-fast無効化 */
  forbidOnly: !!process.env.CI,
  /* 失敗時の再試行回数 */
  retries: process.env.CI ? 2 : 0,
  /* 同時実行ワーカー数 */
  workers: process.env.CI ? 1 : undefined,
  /* レポーター設定 */
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/e2e-results.json' }]
  ],
  /* 全テスト共通設定 */
  use: {
    /* ベースURL */
    baseURL: 'http://localhost:3000',
    /* ブラウザコンテキスト設定 */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    /* ヘッドレスモード (CI環境では常にtrue) */
    headless: !!process.env.CI,
    /* タイムアウト設定 */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* テストプロジェクト設定 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 必要に応じて他のブラウザも追加可能
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* 開発サーバー設定 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* テスト結果出力ディレクトリ */
  outputDir: 'test-results/',
  
  /* グローバル設定 */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  /* タイムアウト設定 */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
});