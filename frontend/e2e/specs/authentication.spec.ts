import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

/**
 * 認証機能のE2Eテスト
 * 
 * テストシナリオ:
 * 1. ログイン・ログアウト機能
 * 2. 権限による画面制御
 * 3. セッション管理
 */

test.describe('認証システム', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('管理者としてログインできる', async ({ page }) => {
    await authHelper.loginAsAdmin();
    
    // 管理者ダッシュボードに遷移することを確認
    await expect(page).toHaveURL('/admin/dashboard');
    
    // 管理者メニューが表示されることを確認
    await expect(page.locator('[data-testid="admin-sidebar"]')).toBeVisible();
    
    // ユーザーメニューが表示されることを確認
    await expect(page.locator('[data-testid="user-menu-button"]')).toBeVisible();
  });

  test('エンジニアとしてログインできる', async ({ page }) => {
    await authHelper.loginAsEngineer();
    
    // エンジニアダッシュボードに遷移することを確認
    await expect(page).toHaveURL('/dashboard');
    
    // エンジニア用メニューが表示されることを確認
    await expect(page.locator('[data-testid="engineer-sidebar"]')).toBeVisible();
    
    // ユーザーメニューが表示されることを確認
    await expect(page.locator('[data-testid="user-menu-button"]')).toBeVisible();
  });

  test('ログアウトできる', async ({ page }) => {
    // まずログイン
    await authHelper.loginAsAdmin();
    
    // ログアウト
    await authHelper.logout();
    
    // ログインページに遷移することを確認
    await expect(page).toHaveURL('/login');
    
    // ユーザーメニューが表示されないことを確認
    await expect(page.locator('[data-testid="user-menu-button"]')).not.toBeVisible();
  });

  test('無効な認証情報でログインに失敗する', async ({ page }) => {
    await page.goto('/login');
    
    await page.waitForSelector('[data-testid="login-form"]');
    
    // 無効な認証情報を入力
    await page.fill('[data-testid="email-input"]', 'invalid@duesk.co.jp');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    await page.click('[data-testid="login-button"]');
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // ログインページに留まることを確認
    await expect(page).toHaveURL('/login');
  });

  test('未認証ユーザーは保護されたページにアクセスできない', async ({ page }) => {
    // 直接保護されたページにアクセス
    await page.goto('/admin/dashboard');
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/login');
  });

  test('ロール切り替えが正常に動作する（管理者が持つ場合）', async ({ page }) => {
    await authHelper.loginAsAdmin();
    
    // ロール切り替えボタンが表示される場合
    const roleSwitcher = page.locator('[data-testid="role-switcher"]');
    
    if (await roleSwitcher.isVisible()) {
      // エンジニアロールに切り替え
      await page.selectOption('[data-testid="role-select"]', 'engineer');
      
      // エンジニアダッシュボードに遷移することを確認
      await expect(page).toHaveURL('/dashboard');
      
      // 管理者ロールに戻す
      await page.selectOption('[data-testid="role-select"]', 'admin');
      
      // 管理者ダッシュボードに遷移することを確認
      await expect(page).toHaveURL('/admin/dashboard');
    }
  });

  test('セッション有効期限切れ時の処理', async ({ page }) => {
    await authHelper.loginAsAdmin();
    
    // セッションを無効化（ブラウザのローカルストレージをクリア）
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // 保護されたページにアクセス
    await page.goto('/admin/engineers');
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/login');
  });

  test('認証トークンの自動更新', async ({ page }) => {
    await authHelper.loginAsAdmin();
    
    // 一定時間待機してトークンの自動更新をテスト
    await page.waitForTimeout(5000);
    
    // 保護されたページにアクセスしてセッションが維持されることを確認
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('/admin/dashboard');
    
    // まだログイン状態であることを確認
    await expect(page.locator('[data-testid="admin-sidebar"]')).toBeVisible();
  });
});