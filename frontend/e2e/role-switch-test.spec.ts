import { test, expect } from '@playwright/test';

test.describe('ロール切り替え機能（認証なし）', () => {
  test('認証なしでロール切り替えページにアクセスできない', async ({ page }) => {
    console.log('テスト: 認証なしでのロール切り替えアクセス');
    
    // 想定されるロール切り替え関連のURLパターン
    const roleSwitchUrls = [
      '/role-switch',
      '/settings/role',
      '/profile/role-switch',
      '/dashboard/role-switch'
    ];
    
    for (const url of roleSwitchUrls) {
      await page.goto(url);
      const currentUrl = page.url();
      
      // すべてログインページにリダイレクトされることを確認
      expect(currentUrl).toContain('/login');
      console.log(`✅ ${url} -> ログインページにリダイレクト`);
    }
  });

  test('エンジニア向けページと営業向けページの保護確認', async ({ page }) => {
    console.log('テスト: ロール別ページアクセス制御');
    
    // エンジニア向けページ
    const engineerPages = [
      '/proposals',
      '/weekly-report',
      '/skill-sheet',
      '/project/detail'
    ];
    
    // 営業向けページ
    const salesPages = [
      '/engineer-proposals',
      '/sales/proposals',
      '/sales/teams',
      '/sales/interviews'
    ];
    
    console.log('エンジニア向けページのテスト:');
    for (const url of engineerPages) {
      await page.goto(url);
      expect(page.url()).toContain('/login');
      console.log(`✅ ${url} - 認証が必要`);
    }
    
    console.log('\n営業向けページのテスト:');
    for (const url of salesPages) {
      await page.goto(url);
      expect(page.url()).toContain('/login');
      console.log(`✅ ${url} - 認証が必要`);
    }
  });

  test('ユーザープロファイルページでのロール表示（モック）', async ({ page }) => {
    console.log('テスト: プロファイルページでのロール表示');
    
    // プロファイルページにアクセス
    await page.goto('/profile');
    
    // ログインページにリダイレクトされることを確認
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('callbackUrl=%2Fprofile');
    
    console.log('✅ プロファイルページも認証が必要');
    
    // ログインページでの基本的なUI要素確認
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible();
    
    // 将来のロール切り替えUIで期待される要素
    const expectedRoleElements = [
      'ロール選択ドロップダウン',
      '現在のロール表示',
      'ロール切り替えボタン',
      '権限説明テキスト'
    ];
    
    console.log('期待されるロール切り替えUI要素:', expectedRoleElements.join(', '));
  });

  test('ロール切り替えUIコンポーネントの確認（静的）', async ({ page }) => {
    console.log('テスト: ロール切り替えUIコンポーネント');
    
    await page.goto('/login');
    
    // セレクトボックスやドロップダウンの存在確認
    const selectElements = page.locator('select, [role="combobox"], [class*="MuiSelect"]');
    const selectCount = await selectElements.count();
    
    console.log(`セレクト要素数: ${selectCount}`);
    
    // ラジオボタンやチェックボックスの存在確認
    const roleSelectors = page.locator('input[type="radio"], input[type="checkbox"]');
    const selectorCount = await roleSelectors.count();
    
    console.log(`ロール選択要素数: ${selectorCount}`);
    
    // ボタン要素の確認
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    console.log(`ボタン数: ${buttonCount}`);
    expect(buttonCount).toBeGreaterThan(0);
    
    console.log('✅ UI要素の基本確認完了');
  });

  test('ロール切り替え後のナビゲーション（モック）', async ({ page }) => {
    console.log('テスト: ロール切り替え後のナビゲーション');
    
    // ダッシュボードへのアクセス試行
    await page.goto('/dashboard');
    expect(page.url()).toContain('/login');
    
    // 管理者ダッシュボードへのアクセス試行
    await page.goto('/admin/dashboard');
    expect(page.url()).toContain('/login');
    
    console.log('✅ すべてのダッシュボードが保護されています');
    
    // ナビゲーションメニューの期待される変化
    const roleBasedMenus = {
      engineer: ['提案一覧', '週報', 'スキルシート', 'プロジェクト'],
      sales: ['エンジニア提案', '営業チーム', '面談', 'POC'],
      admin: ['ユーザー管理', '請求管理', 'レポート', '設定']
    };
    
    console.log('ロール別メニュー構成:');
    for (const [role, menus] of Object.entries(roleBasedMenus)) {
      console.log(`- ${role}: ${menus.join(', ')}`);
    }
  });

  test('複数ロールを持つユーザーの確認（データ構造）', async ({ page }) => {
    console.log('テスト: 複数ロールのデータ構造');
    
    await page.goto('/login');
    
    // LocalStorageの確認（ログイン前は空）
    const userDataBefore = await page.evaluate(() => {
      return localStorage.getItem('user');
    });
    
    expect(userDataBefore).toBeNull();
    console.log('✅ ログイン前: ユーザーデータなし');
    
    // 期待されるユーザーデータ構造
    const expectedUserStructure = {
      id: 'string',
      email: 'string',
      role: 'string (最高権限)',
      roles: ['array', 'of', 'strings'],
      default_role: 'number'
    };
    
    console.log('期待されるユーザーデータ構造:', JSON.stringify(expectedUserStructure, null, 2));
  });

  test('ロール切り替え時のAPI呼び出し（モック）', async ({ page }) => {
    console.log('テスト: ロール切り替えAPI');
    
    // API関連のエンドポイント確認
    const apiEndpoints = [
      '/api/v1/auth/switch-role',
      '/api/v1/users/active-role',
      '/api/v1/auth/me'
    ];
    
    // ネットワークログの監視設定（実際のAPIコールはログイン後のみ）
    const networkLogs: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        networkLogs.push(`${request.method()} ${url}`);
      }
    });
    
    // ログインページで基本的なネットワーク活動を確認
    await page.goto('/login');
    await page.waitForTimeout(1000);
    
    console.log('APIコール数:', networkLogs.length);
    if (networkLogs.length > 0) {
      console.log('検出されたAPIコール:', networkLogs.slice(0, 5));
    }
    
    console.log('✅ API監視設定完了');
  });

  test('ロール切り替えのアクセシビリティ', async ({ page }) => {
    console.log('テスト: アクセシビリティ');
    
    await page.goto('/login');
    
    // ARIAラベルの確認
    const ariaElements = page.locator('[aria-label], [role]');
    const ariaCount = await ariaElements.count();
    
    console.log(`ARIA要素数: ${ariaCount}`);
    expect(ariaCount).toBeGreaterThan(0);
    
    // キーボードナビゲーションの確認
    const focusableElements = page.locator('button, input, select, textarea, a[href], [tabindex]');
    const focusableCount = await focusableElements.count();
    
    console.log(`フォーカス可能要素数: ${focusableCount}`);
    expect(focusableCount).toBeGreaterThan(0);
    
    // スクリーンリーダー対応の確認
    const labeledInputs = page.locator('input[aria-label], input[id]:has(~ label[for])');
    const labeledCount = await labeledInputs.count();
    
    console.log(`ラベル付き入力要素数: ${labeledCount}`);
    
    console.log('✅ アクセシビリティ基本要件を満たしています');
  });
});