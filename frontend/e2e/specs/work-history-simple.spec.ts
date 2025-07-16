import { test, expect } from '@playwright/test';
import { TestAuthHelper } from '../helpers/test-auth-helper';
import { WorkHistoryHelper } from '../helpers/work-history-helper';

test.describe('職務経歴管理（シンプルテスト）', () => {
  let testAuthHelper: TestAuthHelper;
  let workHistoryHelper: WorkHistoryHelper;

  test.beforeEach(async ({ page }) => {
    testAuthHelper = new TestAuthHelper(page);
    workHistoryHelper = new WorkHistoryHelper(page);
  });

  test('エンジニアの職務経歴一覧ページアクセス', async ({ page }) => {
    // APIレスポンスをモック（アクセスする前に設定）
    await page.route('**/api/v1/work-history**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          work_histories: [],
          summary: {
            total_projects: 0,
            total_months: 0,
            primary_industry: null
          },
          it_experience: {
            years: 0,
            months: 0,
            total_months: 0
          },
          technology_skills: [],
          total: 0
        })
      });
    });

    // マスターデータのAPIもモック
    await page.route('**/api/v1/work-history/master-data**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          industries: [
            { id: 1, name: 'IT・ソフトウェア' },
            { id: 2, name: '金融' },
            { id: 3, name: '製造業' }
          ],
          processes: [
            { id: 1, name: '要件定義' },
            { id: 2, name: '設計' },
            { id: 3, name: '実装' }
          ],
          technology_categories: [
            { id: 1, name: 'プログラミング言語' },
            { id: 2, name: 'フレームワーク' },
            { id: 3, name: 'データベース' }
          ]
        })
      });
    });
    
    // 認証情報を設定
    await testAuthHelper.setupEngineerAuth();
    
    // 職務経歴ページに直接アクセス
    await page.goto('/work-history');
    
    // ページが読み込まれるまで待つ
    await page.waitForLoadState('networkidle');
    
    // 現在のURLを確認
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // ページ内容を確認
    const pageContent = await page.textContent('body');
    console.log('Page content preview:', pageContent?.substring(0, 200));
    
    // 職務経歴ページの要素を確認
    // まず、より一般的な要素を探す
    const hasWorkHistoryContent = 
      (await page.locator('text="職務経歴"').count()) > 0 ||
      (await page.locator('h1, h2, h3, h4, h5, h6').filter({ hasText: '職務経歴' }).count()) > 0;
    
    if (hasWorkHistoryContent) {
      console.log('職務経歴ページが表示されています');
      expect(hasWorkHistoryContent).toBe(true);
    } else {
      // ログインページにリダイレクトされた場合
      if (currentUrl.includes('/login')) {
        console.log('ログインページにリダイレクトされました');
        
        // LocalStorageの状態を確認
        const authState = await page.evaluate(() => ({
          user: localStorage.getItem('monstera_user'),
          authState: localStorage.getItem('monstera_auth_state')
        }));
        console.log('Auth state in localStorage:', authState);
        
        // Cookieの状態を確認
        const cookies = await page.context().cookies();
        console.log('Cookies:', cookies);
      }
      
      // スクリーンショットを保存
      await page.screenshot({ path: 'test-results/work-history-simple-test.png' });
      
      expect(hasWorkHistoryContent).toBe(true);
    }
  });
});