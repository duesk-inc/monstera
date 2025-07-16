import { Page } from '@playwright/test';
import { TEST_EMAILS } from '../../src/test-utils/test-emails';

/**
 * テスト用の認証ヘルパー（シンプル版）
 */
export class TestAuthHelper {
  constructor(private page: Page) {}

  /**
   * エンジニアとして認証状態を設定（直接LocalStorageに設定）
   */
  async setupEngineerAuth() {
    // 任意のページに移動（LocalStorageを設定するため）
    await this.page.goto('/');
    
    // LocalStorageに認証情報を設定
    await this.page.evaluate(() => {
      const user = {
        id: 'test-engineer-001',
        email: TEST_EMAILS.engineer,
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
        expires: Date.now() + 60 * 60 * 1000 // 1時間後
      }));
    });
    
    // Cognitoトークンのダミーを設定（実際のCognito認証フローをスキップ）
    const dummyCognitoToken = 'dummy-cognito-access-token-for-engineer';
    
    await this.page.context().addCookies([
      {
        name: 'access_token',
        value: dummyCognitoToken,
        domain: 'localhost',
        path: '/',
        httpOnly: false, // E2EテストなのでhttpOnly: falseで設定
        secure: false,
        sameSite: 'Lax'
      }
    ]);
    
    console.log('Engineer auth setup completed');
  }

  /**
   * 管理者として認証状態を設定
   */
  async setupAdminAuth() {
    await this.page.goto('/');
    
    await this.page.evaluate(() => {
      const user = {
        id: 'test-admin-001',
        email: TEST_EMAILS.admin,
        firstName: 'テスト',
        lastName: '管理者',
        role: 'admin',
        roles: ['admin', 'manager', 'employee'],
        defaultRole: 'admin',
        phoneNumber: null
      };
      
      localStorage.setItem('monstera_user', JSON.stringify(user));
      localStorage.setItem('monstera_auth_state', JSON.stringify({
        authenticated: true,
        expires: Date.now() + 60 * 60 * 1000
      }));
    });
    
    // Cognitoトークンのダミーを設定（管理者用）
    const dummyCognitoAdminToken = 'dummy-cognito-access-token-for-admin';
    
    await this.page.context().addCookies([
      {
        name: 'access_token',
        value: dummyCognitoAdminToken,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      }
    ]);
    
    console.log('Admin auth setup completed');
  }
}