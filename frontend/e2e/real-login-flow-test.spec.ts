import { test, expect } from '@playwright/test';

test.describe('実際のログインフロー確認', () => {
  test('ログインフォームの動作確認', async ({ page }) => {
    console.log('🚀 実際のログインフロー確認開始');
    
    // 1. ログインページにアクセス
    await page.goto('/login');
    console.log('✅ ログインページにアクセス');
    
    // 2. ログインフォームに入力
    await page.fill('input[type="email"]', 'test@duesk.co.jp');
    await page.fill('input[type="password"]', 'password123');
    console.log('✅ フォームに入力完了');
    
    // 3. ネットワークリクエストを監視
    const loginResponse = page.waitForResponse(
      response => response.url().includes('/api/v1/auth/login') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);
    
    // 4. ログインボタンをクリック
    await page.click('button[type="submit"]');
    console.log('✅ ログインボタンをクリック');
    
    // 5. レスポンスを待つ
    const response = await loginResponse;
    if (response) {
      console.log('✅ ログインAPIレスポンス:', response.status());
      const responseBody = await response.json();
      console.log('レスポンス内容:', JSON.stringify(responseBody, null, 2));
    } else {
      console.log('❌ ログインAPIレスポンスなし（タイムアウト）');
    }
    
    // 6. 現在のURLを確認
    await page.waitForTimeout(2000); // 遷移を待つ
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);
    
    // 7. エラーメッセージを確認
    const errorAlert = page.locator('.MuiAlert-standardError');
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent();
      console.log('❌ エラーメッセージ:', errorText);
    }
    
    // 8. 現在のページ状態を確認
    const pageContent = await page.textContent('body');
    if (pageContent?.includes('ダッシュボード')) {
      console.log('✅ ダッシュボードに到達');
    } else if (pageContent?.includes('ログイン')) {
      console.log('⚠️ まだログインページにいます');
    }
  });
  
  test('APIモックを使用したログインテスト', async ({ page, context }) => {
    console.log('🚀 APIモックログインテスト開始');
    
    // APIレスポンスをモック
    await page.route('**/api/v1/auth/login', async route => {
      console.log('🔧 ログインAPIをモック');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-001',
            name: 'テストユーザー',
            email: 'test@duesk.co.jp',
            role: 'engineer'
          },
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token'
        }),
        headers: {
          'Set-Cookie': 'access_token=mock-access-token; Path=/; HttpOnly; SameSite=Lax'
        }
      });
    });
    
    // 1. ログインページにアクセス
    await page.goto('/login');
    
    // 2. フォームに入力してログイン
    await page.fill('input[type="email"]', 'test@duesk.co.jp');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 3. 遷移を待つ
    try {
      await page.waitForURL('/dashboard', { timeout: 5000 });
      console.log('✅ ダッシュボードに遷移成功');
    } catch {
      const currentUrl = page.url();
      console.log('❌ 遷移失敗。現在のURL:', currentUrl);
      
      // Cookieの状態を確認
      const cookies = await context.cookies();
      console.log('Cookies:', cookies);
      
      // LocalStorageの状態を確認
      const localStorage = await page.evaluate(() => {
        return {
          user: localStorage.getItem('user'),
          token: localStorage.getItem('token')
        };
      });
      console.log('LocalStorage:', localStorage);
    }
    
    // 4. 提案ページへのアクセスを試行
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');
    
    const finalUrl = page.url();
    console.log('最終URL:', finalUrl);
    
    if (finalUrl.includes('/proposals')) {
      console.log('✅ 提案ページにアクセス成功');
      
      // ページ内容を確認
      const headerText = await page.locator('h1, h2, h3, h4').first().textContent();
      console.log('ページヘッダー:', headerText);
    } else {
      console.log('❌ 提案ページにアクセスできませんでした');
    }
  });
});