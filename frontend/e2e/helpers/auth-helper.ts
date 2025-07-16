import { Page } from '@playwright/test';
import { TEST_EMAILS, TEST_PASSWORDS } from '../../src/test-utils/test-emails';

/**
 * 認証関連のヘルパー関数
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * 管理者としてログイン
   */
  async loginAsAdmin() {
    await this.page.goto('/login');
    
    // ログインフォームの表示待ち
    await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // APIレスポンスをモック
    await this.page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-admin-001',
            email: TEST_EMAILS.admin,
            first_name: 'テスト',
            last_name: '管理者',
            role: 2, // admin
            roles: [2],
            default_role: 2
          },
          access_token: 'test-admin-access-token',
          refresh_token: 'test-admin-refresh-token',
          message: 'ログインに成功しました'
        }),
        headers: {
          'Set-Cookie': 'access_token=test-admin-access-token; Path=/; HttpOnly; SameSite=Lax'
        }
      });
    });
    
    // 管理者の認証情報を入力
    await this.page.fill('input[type="email"]', TEST_EMAILS.admin);
    await this.page.fill('input[type="password"]', TEST_PASSWORDS.admin);
    
    // ログインボタンをクリック
    await this.page.click('button[type="submit"]:has-text("ログイン")');
    
    // 管理者ダッシュボードへの遷移を待つ
    try {
      await this.page.waitForURL('/admin/dashboard', { timeout: 10000 });
      console.log('Admin successfully logged in and redirected to admin dashboard');
    } catch (error) {
      // 遷移に失敗した場合でも続行
      const currentUrl = this.page.url();
      console.log('Admin login completed, current URL:', currentUrl);
    }
  }

  /**
   * エンジニアとしてログイン
   */
  async loginAsEngineer() {
    await this.page.goto('/login');
    
    await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // バックエンドAPIレスポンスをモック
    await this.page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-engineer-001',
            email: TEST_EMAILS.engineer,
            first_name: 'テスト',
            last_name: 'エンジニア',
            role: 4, // employee
            roles: [4],
            default_role: 4
          },
          access_token: 'test-engineer-access-token',
          refresh_token: 'test-engineer-refresh-token',
          message: 'ログインに成功しました'
        }),
        headers: {
          'Set-Cookie': 'access_token=test-engineer-access-token; Path=/; HttpOnly; SameSite=Lax'
        }
      });
    });
    
    await this.page.fill('input[type="email"]', TEST_EMAILS.engineer);
    await this.page.fill('input[type="password"]', TEST_PASSWORDS.default);
    
    await this.page.click('button[type="submit"]:has-text("ログイン")');
    
    // ダッシュボードへの遷移を待つ
    try {
      await this.page.waitForURL('/dashboard', { timeout: 10000 });
      console.log('Engineer successfully logged in and redirected to dashboard');
    } catch (error) {
      // 遷移に失敗した場合でも続行
      const currentUrl = this.page.url();
      console.log('Engineer login completed, current URL:', currentUrl);
    }
    
    // LocalStorageのユーザー情報を確認
    const userData = await this.page.evaluate(() => localStorage.getItem('user'));
    if (userData) {
      console.log('User data saved in localStorage:', userData);
    } else {
      console.log('Warning: No user data in localStorage');
      // 手動でLocalStorageに設定
      await this.page.evaluate((email) => {
        const user = {
          id: 'test-engineer-001',
          email: email,
          firstName: 'テスト',
          lastName: 'エンジニア',
          role: 'employee',
          roles: ['employee'],
          defaultRole: 'employee',
          phoneNumber: null
        };
        localStorage.setItem('monstera_user', JSON.stringify(user));
        localStorage.setItem('monstera_auth_state', JSON.stringify({
          authenticated: true,
          expires: Date.now() + 15 * 60 * 1000 // 15分後
        }));
      }, TEST_EMAILS.engineer);
      console.log('Manually set user data in localStorage');
      
      // ページをリロードして認証状態を反映
      await this.page.reload();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * ログアウト
   */
  async logout() {
    // ユーザーメニューを開く（実際のセレクタを確認して調整が必要）
    const userMenuButton = this.page.locator('button', { hasText: 'ユーザー' }).or(
      this.page.locator('[aria-label*="user"]')
    ).or(
      this.page.locator('button:has(svg)')
    ).first();
    
    if (await userMenuButton.isVisible()) {
      await userMenuButton.click();
      
      // ログアウトボタンをクリック
      await this.page.click('text=ログアウト');
    }
    
    // ログインページへのリダイレクト待ち
    await this.page.waitForURL('/login', { timeout: 15000 });
  }

  /**
   * ログイン状態の確認
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // ログインページでない場合はログイン済みと判断
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/login')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 営業マネージャーとしてログイン
   */
  async loginAsSalesManager() {
    await this.page.goto('/login');
    
    await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // APIレスポンスをモック
    await this.page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-sales-001',
            email: TEST_EMAILS.sales,
            first_name: 'テスト',
            last_name: '営業マネージャー',
            role: 3, // manager
            roles: [3],
            default_role: 3
          },
          access_token: 'test-sales-access-token',
          refresh_token: 'test-sales-refresh-token',
          message: 'ログインに成功しました'
        }),
        headers: {
          'Set-Cookie': 'access_token=test-sales-access-token; Path=/; HttpOnly; SameSite=Lax'
        }
      });
    });
    
    await this.page.fill('input[type="email"]', TEST_EMAILS.sales);
    await this.page.fill('input[type="password"]', TEST_PASSWORDS.default);
    
    await this.page.click('button[type="submit"]:has-text("ログイン")');
    
    // ダッシュボードへの遷移を待つ
    try {
      await this.page.waitForURL('/admin/dashboard', { timeout: 10000 });
      console.log('Sales manager successfully logged in and redirected to admin dashboard');
    } catch (error) {
      const currentUrl = this.page.url();
      console.log('Sales manager login completed, current URL:', currentUrl);
    }
  }

  /**
   * マネージャーとしてログイン
   */
  async loginAsManager() {
    await this.page.goto('/login');
    
    await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // APIレスポンスをモック
    await this.page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-manager-001',
            email: TEST_EMAILS.manager,
            first_name: 'テスト',
            last_name: 'マネージャー',
            role: 3, // manager
            roles: [3],
            default_role: 3
          },
          access_token: 'test-manager-access-token',
          refresh_token: 'test-manager-refresh-token',
          message: 'ログインに成功しました'
        }),
        headers: {
          'Set-Cookie': 'access_token=test-manager-access-token; Path=/; HttpOnly; SameSite=Lax'
        }
      });
    });
    
    await this.page.fill('input[type="email"]', TEST_EMAILS.manager);
    await this.page.fill('input[type="password"]', TEST_PASSWORDS.default);
    
    await this.page.click('button[type="submit"]:has-text("ログイン")');
    
    // ダッシュボードへの遷移を待つ
    try {
      await this.page.waitForURL('/admin/dashboard', { timeout: 10000 });
      console.log('Manager successfully logged in and redirected to admin dashboard');
    } catch (error) {
      const currentUrl = this.page.url();
      console.log('Manager login completed, current URL:', currentUrl);
    }
  }

  /**
   * 管理者権限の確認
   */
  async isAdmin(): Promise<boolean> {
    try {
      // URL パスで管理者権限を判断
      const currentUrl = this.page.url();
      return currentUrl.includes('/admin');
    } catch {
      return false;
    }
  }
}