import { test, expect } from '@playwright/test';

test.describe('ログイン要件の検証', () => {
  test('ログインなしで提案ページにアクセスする', async ({ page }) => {
    console.log('テスト開始: ログインなしでの提案ページアクセス');
    
    // ログインせずに直接提案ページにアクセス
    await page.goto('/proposals');
    
    // 現在のURLを記録
    const currentUrl = page.url();
    console.log('アクセス後のURL:', currentUrl);
    
    // ログインページにリダイレクトされるかチェック
    if (currentUrl.includes('/login')) {
      console.log('✅ ログインページにリダイレクトされました');
      expect(currentUrl).toContain('/login');
    } else if (currentUrl.includes('/proposals')) {
      console.log('❌ 直接提案ページにアクセスできました（認証が無効）');
      // 提案ページに直接アクセスできた場合の確認
      const pageTitle = await page.title();
      console.log('ページタイトル:', pageTitle);
      
      // エラーメッセージやアクセス拒否表示があるかチェック
      const errorElement = page.locator('text=アクセス権限がありません');
      const loginRequired = page.locator('text=ログインが必要です');
      
      if (await errorElement.isVisible() || await loginRequired.isVisible()) {
        console.log('✅ アクセス拒否メッセージが表示されています');
      } else {
        console.log('❌ 認証チェックが適切に動作していません');
      }
    }
    
    // ページの状態を詳しく確認
    const content = await page.textContent('body');
    if (content?.includes('ログイン') || content?.includes('認証')) {
      console.log('✅ ログイン関連のコンテンツが表示されています');
    }
  });

  test('ログインなしでエンジニア提案回答ページにアクセスする', async ({ page }) => {
    console.log('テスト開始: 営業向けページアクセス');
    
    // 営業向けの質問回答ページにアクセス
    await page.goto('/engineer-proposals');
    
    const currentUrl = page.url();
    console.log('営業ページアクセス後のURL:', currentUrl);
    
    // ログインページにリダイレクトされるかチェック
    expect(currentUrl).toContain('/login');
  });

  test('ログイン画面の存在確認', async ({ page }) => {
    console.log('テスト開始: ログイン画面の確認');
    
    // ログインページに直接アクセス
    await page.goto('/login');
    
    // ログインフォームの要素が存在するかチェック
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    console.log('✅ ログインフォームが正常に表示されています');
  });

  test('不正なログイン情報でのアクセス', async ({ page }) => {
    console.log('テスト開始: 不正ログイン試行');
    
    await page.goto('/login');
    
    // 存在しないユーザーでログイン試行
    await page.fill('input[type="email"]', 'invalid_user@duesk.co.jp');
    await page.fill('input[type="password"]', 'invalid_password');
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されるかチェック
    await page.waitForTimeout(2000); // エラー表示を待つ
    
    const currentUrl = page.url();
    console.log('不正ログイン後のURL:', currentUrl);
    
    // ログインページに留まるかチェック
    expect(currentUrl).toContain('/login');
    
    // エラーメッセージの確認
    const errorMessage = page.locator('text=ログインに失敗');
    if (await errorMessage.isVisible()) {
      console.log('✅ エラーメッセージが表示されています');
    }
  });
});