import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: '../test-results/ci-20250703-004754',
  fullyParallel: true,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: '../test-results/ci-20250703-004754/results.json' }],
    ['html', { outputFolder: '../test-results/ci-20250703-004754/html-report', open: 'never' }],
    ['junit', { outputFile: '../test-results/ci-20250703-004754/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

  ],

});
