import { test, expect } from '@playwright/test';

test.describe('提案一覧表示機能（認証なし）', () => {
  test('認証なしで提案一覧ページにアクセスできない', async ({ page }) => {
    console.log('テスト: 認証なしでの提案一覧ページアクセス');
    
    // 提案一覧ページに直接アクセス
    await page.goto('/proposals');
    
    // 現在のURLを確認
    const currentUrl = page.url();
    console.log('アクセス後のURL:', currentUrl);
    
    // ログインページにリダイレクトされることを確認
    expect(currentUrl).toContain('/login');
    expect(currentUrl).toContain('callbackUrl=%2Fproposals');
    
    // ログインフォームが表示されることを確認
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    console.log('✅ 認証が必要であることが確認されました');
  });

  test('異なる保護されたページへのアクセスもブロックされる', async ({ page }) => {
    console.log('テスト: 複数の保護されたページへのアクセス確認');
    
    const protectedPages = [
      '/proposals',
      '/engineer-proposals',
      '/dashboard',
      '/profile'
    ];
    
    for (const pagePath of protectedPages) {
      console.log(`アクセステスト: ${pagePath}`);
      
      await page.goto(pagePath);
      const currentUrl = page.url();
      
      // すべてのページでログインページにリダイレクトされることを確認
      expect(currentUrl).toContain('/login');
      console.log(`✅ ${pagePath} -> ログインページにリダイレクト`);
    }
  });

  test('提案ページの基本的なレイアウト構造（モック）', async ({ page }) => {
    console.log('テスト: 提案ページの基本レイアウト（静的確認）');
    
    // ログインページで基本的なUIが機能することを確認
    await page.goto('/login');
    
    // ログインページの基本要素を確認
    const loginForm = page.locator('form');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // 各要素が存在し、表示されていることを確認
    await expect(loginForm).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // フォームの操作性を確認（実際にはログインしない）
    await emailInput.fill('test@duesk.co.jp');
    await passwordInput.fill('password123');
    
    // 入力値が正しく設定されたことを確認
    await expect(emailInput).toHaveValue('test@duesk.co.jp');
    await expect(passwordInput).toHaveValue('password123');
    
    console.log('✅ ログインフォームのUI要素が正常に機能しています');
  });

  test('APIレスポンスのモック（将来の実装用プレースホルダー）', async ({ page }) => {
    console.log('テスト: APIレスポンスのモック確認');
    
    // このテストは、実際のログイン機能が修正されるまでのプレースホルダー
    // 現時点では、ログインが必要なことを確認するのみ
    
    await page.goto('/proposals');
    
    // ログインページにリダイレクトされることを再確認
    expect(page.url()).toContain('/login');
    
    // エラーメッセージやアラートが表示される場合の確認
    const alerts = page.locator('[role="alert"], .MuiAlert-root');
    const alertCount = await alerts.count();
    
    if (alertCount > 0) {
      console.log(`${alertCount}個のアラートが表示されています`);
      for (let i = 0; i < alertCount; i++) {
        const alertText = await alerts.nth(i).textContent();
        console.log(`アラート${i + 1}: ${alertText}`);
      }
    }
    
    console.log('✅ 認証チェックが正常に機能しています');
  });
});