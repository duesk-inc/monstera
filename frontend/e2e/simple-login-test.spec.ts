import { test, expect } from '@playwright/test';
import { TEST_EMAILS } from '../src/test-utils/test-emails';

test.describe('シンプルなログインテスト', () => {
  test('ダミーログインで提案ページにアクセス', async ({ page }) => {
    console.log('🚀 シンプルなログインテスト開始');
    
    // 1. ログインページにアクセス
    await page.goto('/login');
    console.log('✅ ログインページにアクセス');
    
    // 2. ダミーユーザー情報をLocalStorageに設定
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'test-engineer-001',
        name: 'テストエンジニア',
        email: TEST_EMAILS.engineer,
        role: 'engineer'
      }));
      console.log('LocalStorage設定完了');
    });
    
    // 3. 提案ページに直接アクセス
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');
    
    // 4. 現在のURLを確認
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);
    
    // 5. ページの内容を確認
    const pageTitle = await page.title();
    console.log('ページタイトル:', pageTitle);
    
    // 6. ページの主要な要素を確認
    try {
      // ヘッダーの確認
      const headerText = await page.locator('h1, h2, h3, h4').first().textContent();
      console.log('ヘッダーテキスト:', headerText);
      
      // エラーメッセージの確認
      const errorElements = await page.locator('.MuiAlert-standardError').count();
      if (errorElements > 0) {
        const errorText = await page.locator('.MuiAlert-standardError').first().textContent();
        console.log('❌ エラーメッセージ:', errorText);
      }
      
      // 成功メッセージの確認
      const successElements = await page.locator('.MuiAlert-standardSuccess').count();
      if (successElements > 0) {
        const successText = await page.locator('.MuiAlert-standardSuccess').first().textContent();
        console.log('✅ 成功メッセージ:', successText);
      }
      
      // 提案カードの確認
      const proposalCards = await page.locator('[data-testid="proposal-card"]').count();
      console.log('提案カード数:', proposalCards);
      
      // 空状態メッセージの確認
      const emptyStateText = await page.locator('text=まだ提案された案件はありません').count();
      if (emptyStateText > 0) {
        console.log('📭 空状態メッセージが表示されています');
      }
      
      // ログイン要求メッセージの確認
      const loginRequired = await page.locator('text=ログインが必要です').count();
      if (loginRequired > 0) {
        console.log('🔐 ログインが必要というメッセージが表示されています');
      }
      
    } catch (error) {
      console.log('要素の確認中にエラー:', error);
    }
    
    // 7. スクリーンショットを保存
    await page.screenshot({ path: 'test-results/simple-login-page-state.png' });
    console.log('📸 スクリーンショットを保存しました');
    
    // 8. 基本的なアサーション
    if (currentUrl.includes('/login')) {
      console.log('❌ まだログインページにいます - 認証が機能していません');
      expect(currentUrl).not.toContain('/login');
    } else if (currentUrl.includes('/proposals')) {
      console.log('✅ 提案ページにアクセスできました');
      expect(currentUrl).toContain('/proposals');
    }
  });
  
  test('Cognitoトークンを使用した認証テスト', async ({ page }) => {
    console.log('🚀 Cognito認証テスト開始');
    
    // 1. ログインページにアクセス
    await page.goto('/login');
    
    // 2. ダミーCognitoトークンをCookieに設定
    await page.context().addCookies([
      {
        name: 'access_token',
        value: 'dummy-cognito-token-for-testing',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ]);
    console.log('✅ Cognitoトークンをクッキーに設定');
    
    // 3. LocalStorageにユーザー情報と認証状態を設定
    await page.evaluate(() => {
      localStorage.setItem('monstera_user', JSON.stringify({
        id: 'test-engineer-001',
        firstName: 'テスト',
        lastName: 'エンジニア',
        email: TEST_EMAILS.engineer,
        role: 'employee',
        roles: [4]
      }));
      localStorage.setItem('monstera_auth_state', JSON.stringify({
        authenticated: true,
        expires: Date.now() + 3600000 // 1時間後
      }));
    });
    
    // 4. 提案ページにアクセス
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');
    
    // 5. 結果を確認
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);
    
    // ページ内容の詳細を取得
    const bodyText = await page.textContent('body');
    console.log('ページ内容（先頭200文字）:', bodyText?.substring(0, 200));
  });
});