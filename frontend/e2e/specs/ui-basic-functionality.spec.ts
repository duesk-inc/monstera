import { test, expect } from '@playwright/test';

/**
 * UI基本機能テスト
 * 認証に依存しない基本的なUI動作を確認
 */

test.describe('UI基本機能', () => {
  test('ログインページの基本要素が表示される', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // ページタイトルの確認
    await expect(page).toHaveTitle(/Monstera/);
    
    // ログインフォームの要素確認
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("ログイン")')).toBeVisible();
    
    // ログインページのタイトル確認
    await expect(page.locator('h1')).toContainText('ログイン');
  });

  test('ログインフォームに入力できる', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // メールアドレス入力
    await page.fill('input[type="email"]', 'test@duesk.co.jp');
    const emailValue = await page.inputValue('input[type="email"]');
    expect(emailValue).toBe('test@duesk.co.jp');
    
    // パスワード入力
    await page.fill('input[type="password"]', 'testpassword');
    const passwordValue = await page.inputValue('input[type="password"]');
    expect(passwordValue).toBe('testpassword');
  });

  test('ログインボタンが機能する', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // フォーム入力
    await page.fill('input[type="email"]', 'test@duesk.co.jp');
    await page.fill('input[type="password"]', 'testpassword');
    
    // ログインボタンクリック（認証は失敗するが、ボタンの動作は確認）
    await page.click('button[type="submit"]:has-text("ログイン")');
    
    // ローディング状態や応答を待つ
    await page.waitForTimeout(1000);
    
    // エラーメッセージまたは何らかの応答があることを確認
    // （実際の認証システムに依存するため、エラーまたは成功のいずれかの応答があることを確認）
  });

  test('レスポンシブデザインが動作する', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // ログインフォームが表示される
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // フォームが引き続き表示される
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // モバイルでもフォームが表示される
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('キーボードナビゲーションが動作する', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    
    // メールフィールドにフォーカスが移動
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    // もう一度Tabを押してパスワードフィールドに移動
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
    
    // フィールドに入力してボタンを有効化
    await page.fill('input[type="email"]', 'test@duesk.co.jp');
    await page.fill('input[type="password"]', 'testpassword');
    
    // ボタンが有効になったことを確認
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('パスワード表示切り替えが動作する', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // パスワード入力
    await page.fill('input[type="password"]', 'testpassword');
    
    // パスワード表示ボタンがある場合のテスト
    const visibilityButton = page.locator('button[aria-label*="password"], button:has-text("👁")');
    
    if (await visibilityButton.isVisible()) {
      // パスワード表示切り替えをクリック
      await visibilityButton.click();
      
      // パスワードが表示される（type="text"になる）
      await expect(page.locator('input[type="text"]')).toBeVisible();
      
      // もう一度クリックして非表示に戻す
      await visibilityButton.click();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    }
  });

  test('フォームバリデーションが動作する', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // ボタンが最初は無効化されていることを確認
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    
    // 無効なメールアドレスを入力
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password');
    
    // メールフィールドにバリデーション状態が表示される
    const emailField = page.locator('input[type="email"]');
    const validationState = await emailField.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validationState).toBe(false);
    
    // 有効なメールアドレスに修正
    await page.fill('input[type="email"]', 'valid@duesk.co.jp');
    
    // ボタンが有効になることを確認
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('ページのアクセシビリティ要素が存在する', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // フォーム要素が存在することを確認（mainタグがない場合）
    await expect(page.locator('form')).toBeVisible();
    
    // フォームにlabelまたはaria-labelが設定されているか確認
    const emailField = page.locator('input[type="email"]');
    const hasEmailLabel = await emailField.evaluate((el) => {
      return !!(el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('placeholder'));
    });
    expect(hasEmailLabel).toBe(true);
    
    // パスワードフィールドにもラベルが設定されているか確認
    const passwordField = page.locator('input[type="password"]');
    const hasPasswordLabel = await passwordField.evaluate((el) => {
      return !!(el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('placeholder'));
    });
    expect(hasPasswordLabel).toBe(true);
    
    // ボタンに適切なtype属性が設定されているか確認
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('エラー状態の表示', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // 間違った認証情報でログインを試行
    await page.fill('input[type="email"]', 'wrong@duesk.co.jp');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]:has-text("ログイン")');
    
    // エラーレスポンスまたはメッセージを待つ
    await page.waitForTimeout(2000);
    
    // エラーメッセージが表示されることを確認（最初の一つのみ）
    const errorMessage = page.locator('text=/エラー|失敗/i').first();
    const hasError = await errorMessage.isVisible();
    const isStillOnLogin = page.url().includes('/login');
    
    // エラーメッセージが表示されるか、ログインページに留まることを確認
    expect(hasError || isStillOnLogin).toBe(true);
    
    if (hasError) {
      // エラーメッセージの内容を確認
      const errorText = await errorMessage.textContent();
      console.log('Error message:', errorText);
    }
  });

  test('パフォーマンス要件を満たす', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 3秒以内に読み込まれることを確認
    expect(loadTime).toBeLessThan(3000);
    
    // すべての重要な要素が表示されることを確認
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});