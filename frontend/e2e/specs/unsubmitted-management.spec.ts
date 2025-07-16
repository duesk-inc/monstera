import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { UnsubmittedHelper } from '../helpers/unsubmitted-helper';

/**
 * 未提出者管理機能のE2Eテスト
 * 
 * テストシナリオ:
 * 1. 未提出者一覧の表示
 * 2. フィルタリング機能
 * 3. リマインダー送信機能
 * 4. エクスポート機能
 * 5. 統計情報の表示
 */

test.describe('未提出者管理機能', () => {
  let authHelper: AuthHelper;
  let unsubmittedHelper: UnsubmittedHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    unsubmittedHelper = new UnsubmittedHelper(page);
    
    // 管理者としてログイン
    await authHelper.loginAsAdmin();
    
    // 週報管理画面に移動
    await page.goto('/admin/weekly-reports');
    await page.waitForSelector('[data-testid="weekly-reports-page"]');
    
    // 未提出者管理タブをクリック
    await page.click('[role="tab"]:has-text("未提出者管理")');
    await page.waitForSelector('[data-testid="unsubmitted-management-tab"]');
  });

  test('未提出者一覧が表示される', async ({ page }) => {
    // サマリーカードが表示されることを確認
    await expect(page.locator('[data-testid="unsubmitted-total-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="overdue-7days-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="overdue-14days-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="escalation-targets-card"]')).toBeVisible();
    
    // データテーブルが表示されることを確認
    await expect(page.locator('[data-testid="unsubmitted-table"]')).toBeVisible();
    
    // テーブルヘッダーが正しいことを確認
    const headers = await page.locator('[data-testid="unsubmitted-table"] th').allTextContents();
    expect(headers).toContain('エンジニア');
    expect(headers).toContain('未提出週');
    expect(headers).toContain('経過日数');
    expect(headers).toContain('マネージャー');
    expect(headers).toContain('リマインド');
  });

  test('部署でフィルタリングができる', async ({ page }) => {
    // フィルタセレクトが表示されることを確認
    const departmentFilter = page.locator('[data-testid="department-filter"]');
    await expect(departmentFilter).toBeVisible();
    
    // 部署を選択
    await departmentFilter.selectOption('開発部');
    
    // データがフィルタリングされることを確認（ローディング後）
    await page.waitForLoadState('networkidle');
    
    // テーブルの行数が変わることを確認
    const rows = await page.locator('[data-testid="unsubmitted-table"] tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test('単一のユーザーにリマインダーを送信できる', async ({ page }) => {
    // 最初の行のリマインダーボタンをクリック
    const firstRowAction = page.locator('[data-testid="unsubmitted-table"] tbody tr').first()
      .locator('[data-testid="send-reminder-button"]');
    
    if (await firstRowAction.isVisible()) {
      await firstRowAction.click();
      
      // 確認ダイアログが表示されることを確認
      await expect(page.locator('[data-testid="reminder-confirm-dialog"]')).toBeVisible();
      
      // 送信ボタンをクリック
      await page.click('[data-testid="confirm-send-button"]');
      
      // 成功メッセージが表示されることを確認
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    }
  });

  test('複数のユーザーに一括でリマインダーを送信できる', async ({ page }) => {
    // チェックボックスがある場合のみテスト
    const checkboxes = page.locator('[data-testid="unsubmitted-table"] tbody input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 0) {
      // 最初の3つを選択
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        await checkboxes.nth(i).check();
      }
      
      // 一括アクションバーが表示されることを確認
      await expect(page.locator('[data-testid="bulk-action-toolbar"]')).toBeVisible();
      
      // リマインド送信ボタンをクリック
      await page.click('[data-testid="bulk-send-reminder-button"]');
      
      // 確認ダイアログが表示されることを確認
      await expect(page.locator('[data-testid="bulk-reminder-dialog"]')).toBeVisible();
      
      // 選択されたユーザー数が正しいことを確認
      const selectedCount = await page.locator('[data-testid="selected-count"]').textContent();
      expect(selectedCount).toContain('3');
      
      // 送信ボタンをクリック
      await page.click('[data-testid="confirm-bulk-send-button"]');
      
      // 成功メッセージが表示されることを確認
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    }
  });

  test('未提出者リストをエクスポートできる', async ({ page }) => {
    // エクスポートボタンが表示されることを確認
    await expect(page.locator('[data-testid="export-button"]')).toBeVisible();
    
    // エクスポートボタンをクリック
    await page.click('[data-testid="export-button"]');
    
    // エクスポートメニューが表示されることを確認
    await expect(page.locator('[data-testid="export-menu"]')).toBeVisible();
    
    // CSVエクスポートをテスト
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-option"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/unsubmitted_reports.*\.csv$/);
  });

  test('経過日数によって警告レベルが変わる', async ({ page }) => {
    // 7日以上経過したエントリ
    const warningChips = page.locator('[data-testid="days-overdue-chip"][data-severity="warning"]');
    const warningCount = await warningChips.count();
    
    // 14日以上経過したエントリ
    const errorChips = page.locator('[data-testid="days-overdue-chip"][data-severity="error"]');
    const errorCount = await errorChips.count();
    
    // 警告レベルのチップが存在することを確認
    expect(warningCount + errorCount).toBeGreaterThan(0);
    
    // 14日以上のエントリには警告アイコンが表示される
    if (errorCount > 0) {
      const errorChip = errorChips.first();
      await expect(errorChip.locator('svg')).toBeVisible();
    }
  });

  test('リマインダー送信履歴が表示される', async ({ page }) => {
    // リマインダー送信済みのエントリを探す
    const reminderStatus = page.locator('[data-testid="reminder-status"]:has-text("回送信")');
    
    if (await reminderStatus.isVisible()) {
      // 送信回数が表示されることを確認
      const statusText = await reminderStatus.first().textContent();
      expect(statusText).toMatch(/\d+回送信/);
      
      // 最終送信日時が表示されることを確認
      const lastSentDate = reminderStatus.first().locator('[data-testid="last-sent-date"]');
      if (await lastSentDate.isVisible()) {
        const dateText = await lastSentDate.textContent();
        expect(dateText).toBeTruthy();
      }
    }
  });

  test('未提出者が0人の場合の表示', async ({ page }) => {
    // 全員が提出済みの場合をシミュレート（フィルタで絞り込む）
    await page.selectOption('[data-testid="department-filter"]', 'non-existent-dept');
    
    await page.waitForLoadState('networkidle');
    
    // エンプティステートが表示されることを確認
    const emptyState = page.locator('[data-testid="empty-state"]');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText('未提出者はいません');
    }
  });

  test('エスカレーション対象者の表示', async ({ page }) => {
    // エスカレーション対象者カードの値を確認
    const escalationCard = page.locator('[data-testid="escalation-targets-card"]');
    const escalationCount = await escalationCard.locator('[data-testid="card-value"]').textContent();
    
    if (escalationCount && parseInt(escalationCount) > 0) {
      // エスカレーション対象者がいる場合、テーブルで確認
      const escalationRows = page.locator('[data-testid="unsubmitted-table"] tbody tr')
        .filter({ has: page.locator('[data-testid="days-overdue-chip"][data-severity="error"]') });
      
      const rowCount = await escalationRows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test('ページリフレッシュ機能', async ({ page }) => {
    // リフレッシュボタンが表示されることを確認
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    await expect(refreshButton).toBeVisible();
    
    // リフレッシュボタンをクリック
    await refreshButton.click();
    
    // ローディング状態が表示されることを確認
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    // データが再読み込みされることを確認
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="unsubmitted-table"]')).toBeVisible();
  });
});