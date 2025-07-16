import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { EngineerHelper } from '../helpers/engineer-helper';
import { TEST_EMAILS } from '../../src/test-utils/test-emails';

/**
 * エンジニア管理機能のE2Eテスト
 * 
 * テストシナリオ:
 * 1. 管理者ログイン
 * 2. エンジニア新規作成
 * 3. エンジニア検索・フィルタリング
 * 4. エンジニア情報編集
 * 5. ステータス変更
 * 6. CSVエクスポート/インポート
 * 7. エンジニア削除
 */

test.describe('エンジニア管理システム', () => {
  let authHelper: AuthHelper;
  let engineerHelper: EngineerHelper;
  let testEngineerId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    engineerHelper = new EngineerHelper(page);
  });

  test.afterEach(async ({ page }) => {
    // テスト後のクリーンアップ（必要に応じて）
    try {
      await authHelper.logout();
    } catch {
      // ログアウトに失敗しても継続
    }
  });

  test('管理者でログインしてエンジニア管理ページにアクセスできる', async ({ page }) => {
    // 管理者でログイン
    await authHelper.loginAsAdmin();
    
    // エンジニア管理ページに移動
    await engineerHelper.navigateToEngineerManagement();
    
    // ページタイトルの確認
    await expect(page.locator('[data-testid="page-title"]')).toContainText('エンジニア管理');
    
    // エンジニア一覧テーブルが表示されることを確認
    await expect(page.locator('[data-testid="engineer-list-table"]')).toBeVisible();
    
    // 新規追加ボタンが表示されることを確認
    await expect(page.locator('[data-testid="add-engineer-button"]')).toBeVisible();
  });

  test('新規エンジニアを作成できる', async ({ page }) => {
    const testEngineer = {
      email: `${TEST_EMAILS.default.replace('@', '_create_' + Date.now() + '@')}`,  // 一意のメールアドレスを生成
      firstName: 'Test',
      lastName: 'Engineer',
      firstNameKana: 'テスト',
      lastNameKana: 'エンジニア',
      sei: 'テスト',
      mei: '太郎',
      seiKana: 'てすと',
      meiKana: 'たろう',
      department: '開発部',
      position: 'エンジニア',
      phoneNumber: '090-1234-5678',
    };

    // エンジニアを作成
    await engineerHelper.createEngineer(testEngineer);
    
    // 作成されたエンジニアの詳細情報を確認
    const currentUrl = page.url();
    testEngineerId = currentUrl.split('/').pop() || '';
    
    await engineerHelper.verifyEngineerDetail(testEngineerId, {
      fullName: 'テスト 太郎',
      email: testEngineer.email,
      department: testEngineer.department,
      position: testEngineer.position,
      status: 'アクティブ',
    });
  });

  test('エンジニアを検索できる', async ({ page }) => {
    // 事前にテストエンジニアを作成
    const testEngineer = {
      email: `${TEST_EMAILS.default.replace('@', '_search_' + Date.now() + '@')}`,  // 一意のメールアドレスを生成
      firstName: 'Search',
      lastName: 'Test',
      firstNameKana: 'サーチ',
      lastNameKana: 'テスト',
      sei: 'サーチ',
      mei: '花子',
    };

    await engineerHelper.createEngineer(testEngineer);
    
    // エンジニア一覧で検索
    await engineerHelper.searchEngineer('サーチ');
    
    // 検索結果にエンジニアが表示されることを確認
    await expect(page.locator('[data-testid="engineer-row"]')).toContainText('サーチ 花子');
  });

  test('エンジニア情報を編集できる', async ({ page }) => {
    // 事前にテストエンジニアを作成
    const testEngineer = {
      email: `${TEST_EMAILS.default.replace('@', '_edit_' + Date.now() + '@')}`,  // 一意のメールアドレスを生成
      firstName: 'Edit',
      lastName: 'Test',
      firstNameKana: 'エディット',
      lastNameKana: 'テスト',
      sei: 'エディット',
      mei: '次郎',
      department: '営業部',
      position: 'ジュニアエンジニア',
    };

    await engineerHelper.createEngineer(testEngineer);
    const currentUrl = page.url();
    const engineerId = currentUrl.split('/').pop() || '';
    
    // エンジニア情報を編集
    const updatedData = {
      department: '開発部',
      position: 'シニアエンジニア',
      phoneNumber: '080-9876-5432',
    };

    await engineerHelper.editEngineer(engineerId, updatedData);
    
    // 更新された情報を確認
    await engineerHelper.verifyEngineerDetail(engineerId, {
      fullName: 'エディット 次郎',
      email: testEngineer.email,
      department: updatedData.department,
      position: updatedData.position,
      status: 'アクティブ',
    });
  });

  test('エンジニアのステータスを変更できる', async ({ page }) => {
    // 事前にテストエンジニアを作成
    const testEngineer = {
      email: `${TEST_EMAILS.default.replace('@', '_status_' + Date.now() + '@')}`,  // 一意のメールアドレスを生成
      firstName: 'Status',
      lastName: 'Test',
      firstNameKana: 'ステータス',
      lastNameKana: 'テスト',
      sei: 'ステータス',
      mei: '三郎',
    };

    await engineerHelper.createEngineer(testEngineer);
    const currentUrl = page.url();
    const engineerId = currentUrl.split('/').pop() || '';
    
    // ステータスを変更
    await engineerHelper.changeEngineerStatus(engineerId, 'standby', 'プロジェクト終了のため');
    
    // ステータスが更新されることを確認
    await engineerHelper.verifyEngineerDetail(engineerId, {
      fullName: 'ステータス 三郎',
      email: testEngineer.email,
      status: '待機中',
    });
  });

  test('CSVエクスポートができる', async ({ page }) => {
    // エンジニア管理ページに移動
    await engineerHelper.navigateToEngineerManagement();
    
    // CSVエクスポートを実行
    const download = await engineerHelper.exportEngineersCSV();
    
    // ダウンロードファイルの確認
    expect(download.suggestedFilename()).toMatch(/engineers.*\.csv$/);
    
    // ファイルサイズが0より大きいことを確認
    const path = await download.path();
    const fs = require('fs');
    const stats = fs.statSync(path);
    expect(stats.size).toBeGreaterThan(0);
  });

  test('フィルタリング機能が動作する', async ({ page }) => {
    // エンジニア管理ページに移動
    await engineerHelper.navigateToEngineerManagement();
    
    // ステータスフィルターを適用
    await page.selectOption('[data-testid="status-filter"]', 'active');
    
    // フィルター結果の確認
    await page.waitForSelector('[data-testid="engineer-row"]', { timeout: 10000 });
    
    // 全ての表示されたエンジニアがアクティブステータスであることを確認
    const statusBadges = page.locator('[data-testid="engineer-status-badge"]');
    const count = await statusBadges.count();
    
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toContainText('アクティブ');
    }
  });

  test('ページネーションが動作する', async ({ page }) => {
    // エンジニア管理ページに移動
    await engineerHelper.navigateToEngineerManagement();
    
    // ページネーションが表示される場合のテスト
    const paginationExists = await page.locator('[data-testid="pagination"]').isVisible();
    
    if (paginationExists) {
      // 2ページ目に移動
      await page.click('[data-testid="pagination-next"]');
      
      // URLにページ番号が含まれることを確認
      await expect(page).toHaveURL(/page=2/);
      
      // 1ページ目に戻る
      await page.click('[data-testid="pagination-prev"]');
      
      // URLが1ページ目に戻ることを確認
      await expect(page).toHaveURL(/page=1|(?!page=)/);
    }
  });

  test('エンジニア詳細ページで全ての情報が表示される', async ({ page }) => {
    // 事前にテストエンジニアを作成
    const testEngineer = {
      email: `${TEST_EMAILS.default.replace('@', '_detail_' + Date.now() + '@')}`,  // 一意のメールアドレスを生成
      firstName: 'Detail',
      lastName: 'Test',
      firstNameKana: 'ディテール',
      lastNameKana: 'テスト',
      sei: 'ディテール',
      mei: '四郎',
      department: 'QA部',
      position: 'テストエンジニア',
      phoneNumber: '070-1111-2222',
    };

    await engineerHelper.createEngineer(testEngineer);
    const currentUrl = page.url();
    const engineerId = currentUrl.split('/').pop() || '';
    
    // 詳細ページで各セクションが表示されることを確認
    await expect(page.locator('[data-testid="basic-info-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-info-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="organization-info-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-history-section"]')).toBeVisible();
    
    // 基本情報の確認
    await expect(page.locator('[data-testid="engineer-name"]')).toContainText('ディテール 四郎');
    await expect(page.locator('[data-testid="engineer-email"]')).toContainText(testEngineer.email);
    await expect(page.locator('[data-testid="engineer-department"]')).toContainText(testEngineer.department);
    await expect(page.locator('[data-testid="engineer-position"]')).toContainText(testEngineer.position);
    await expect(page.locator('[data-testid="engineer-phone"]')).toContainText(testEngineer.phoneNumber);
  });

  test('エンジニアを削除できる', async ({ page }) => {
    // 事前にテストエンジニアを作成
    const testEngineer = {
      email: `${TEST_EMAILS.default.replace('@', '_delete_' + Date.now() + '@')}`,  // 一意のメールアドレスを生成
      firstName: 'Delete',
      lastName: 'Test',
      firstNameKana: 'デリート',
      lastNameKana: 'テスト',
      sei: 'デリート',
      mei: '五郎',
    };

    await engineerHelper.createEngineer(testEngineer);
    const currentUrl = page.url();
    const engineerId = currentUrl.split('/').pop() || '';
    
    // エンジニアを削除
    await engineerHelper.deleteEngineer(engineerId);
    
    // エンジニア一覧でエンジニアが表示されないことを確認
    await engineerHelper.verifyEngineerInList('デリート 五郎', false);
  });

  test('権限のないユーザーはエンジニア管理にアクセスできない', async ({ page }) => {
    // エンジニアとしてログイン
    await authHelper.loginAsEngineer();
    
    // エンジニア管理ページに直接アクセスを試行
    await page.goto('/admin/engineers');
    
    // アクセス拒否またはダッシュボードにリダイレクトされることを確認
    await page.waitForURL(/\/(dashboard|access-denied|login)/, { timeout: 10000 });
    
    // エンジニア管理のメニューが表示されないことを確認
    const engineerMenu = page.locator('[data-testid="engineer-management-menu"]');
    await expect(engineerMenu).not.toBeVisible();
  });
});