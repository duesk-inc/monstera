import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

/**
 * 管理者週報管理画面のE2Eテスト
 * 
 * テストシナリオ:
 * 1. 画面遷移とタブ切り替え
 * 2. 未提出者管理タブ
 * 3. 週次レポートタブ
 * 4. 月次レポートタブ
 * 5. アラート設定タブ
 * 6. 権限管理
 */

test.describe('管理者週報管理画面', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    
    // 管理者としてログイン
    await authHelper.loginAsAdmin();
    
    // 週報管理画面に移動
    await page.goto('/admin/weekly-reports');
    await page.waitForSelector('[data-testid="admin-weekly-reports-page"]');
  });

  test.afterEach(async ({ page }) => {
    // セッションクリーンアップ
    await authHelper.logout();
  });

  test.describe('画面遷移とタブ切り替え', () => {
    test('管理者週報管理画面にアクセスできる', async ({ page }) => {
      // ページタイトルを確認
      await expect(page.locator('h4:has-text("週報管理")')).toBeVisible();
      
      // タブが表示されることを確認
      const tabs = page.locator('[role="tablist"]');
      await expect(tabs).toBeVisible();
      
      // 各タブが存在することを確認
      await expect(tabs.locator('[role="tab"]:has-text("未提出者管理")')).toBeVisible();
      await expect(tabs.locator('[role="tab"]:has-text("週次レポート")')).toBeVisible();
      await expect(tabs.locator('[role="tab"]:has-text("月次レポート")')).toBeVisible();
      await expect(tabs.locator('[role="tab"]:has-text("アラート設定")')).toBeVisible();
    });

    test('各タブに切り替えができる', async ({ page }) => {
      // 週次レポートタブ
      await page.click('[role="tab"]:has-text("週次レポート")');
      await expect(page.locator('[data-testid="weekly-report-tab"]')).toBeVisible();
      
      // 月次レポートタブ
      await page.click('[role="tab"]:has-text("月次レポート")');
      await expect(page.locator('[data-testid="monthly-report-tab"]')).toBeVisible();
      
      // アラート設定タブ
      await page.click('[role="tab"]:has-text("アラート設定")');
      await expect(page.locator('[data-testid="alert-settings-tab"]')).toBeVisible();
      
      // 未提出者管理タブに戻る
      await page.click('[role="tab"]:has-text("未提出者管理")');
      await expect(page.locator('[data-testid="unsubmitted-management-tab"]')).toBeVisible();
    });
  });

  test.describe('未提出者管理タブ', () => {
    test.beforeEach(async ({ page }) => {
      // 未提出者管理タブをクリック
      await page.click('[role="tab"]:has-text("未提出者管理")');
      await page.waitForSelector('[data-testid="unsubmitted-management-tab"]');
    });

    test('未提出者統計が表示される', async ({ page }) => {
      // 統計カードが表示される
      await expect(page.locator('[data-testid="unsubmitted-total-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="overdue-7days-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="overdue-14days-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="escalation-targets-card"]')).toBeVisible();
      
      // 各カードに数値が表示される
      const totalValue = await page.locator('[data-testid="unsubmitted-total-card"] [data-testid="card-value"]').textContent();
      expect(totalValue).toMatch(/^\d+$/);
    });

    test('リマインダー一括送信機能', async ({ page }) => {
      // データが存在する場合のみテスト
      const rows = await page.locator('[data-testid="unsubmitted-table"] tbody tr').count();
      
      if (rows > 0) {
        // 全選択チェックボックスをクリック
        await page.click('[data-testid="select-all-checkbox"]');
        
        // 一括アクションバーが表示される
        await expect(page.locator('[data-testid="bulk-action-toolbar"]')).toBeVisible();
        
        // 選択件数が表示される
        const selectedCount = await page.locator('[data-testid="selected-count"]').textContent();
        expect(selectedCount).toMatch(/\d+件選択中/);
        
        // 一括リマインダー送信ボタンをクリック
        await page.click('[data-testid="bulk-send-reminder-button"]');
        
        // 確認ダイアログが表示される
        await expect(page.locator('[data-testid="bulk-reminder-dialog"]')).toBeVisible();
        
        // メッセージ入力
        await page.fill('[data-testid="reminder-message-input"]', 'テストリマインダーメッセージ');
        
        // キャンセルボタンをクリック（実際の送信は避ける）
        await page.click('[data-testid="cancel-button"]');
      }
    });

    test('エクスポート機能のテスト', async ({ page }) => {
      // エクスポートボタンをクリック
      await page.click('[data-testid="export-button"]');
      
      // エクスポートメニューが表示される
      await expect(page.locator('[data-testid="export-menu"]')).toBeVisible();
      
      // CSV、Excel両方のオプションが表示される
      await expect(page.locator('[data-testid="export-csv-option"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-excel-option"]')).toBeVisible();
      
      // メニューを閉じる
      await page.keyboard.press('Escape');
    });
  });

  test.describe('週次レポートタブ', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("週次レポート")');
      await page.waitForSelector('[data-testid="weekly-report-tab"]');
    });

    test('週次レポート一覧が表示される', async ({ page }) => {
      // フィルターが表示される
      await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-picker"]')).toBeVisible();
      
      // データテーブルが表示される
      await expect(page.locator('[data-testid="weekly-reports-table"]')).toBeVisible();
      
      // ページネーションが表示される
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    });

    test('ステータスでフィルタリングできる', async ({ page }) => {
      // ステータスフィルターを選択
      await page.selectOption('[data-testid="status-filter"]', 'submitted');
      
      // データが更新されるのを待つ
      await page.waitForLoadState('networkidle');
      
      // フィルタリングされたデータが表示される
      const statusChips = await page.locator('[data-testid="status-chip"]').allTextContents();
      statusChips.forEach(status => {
        expect(status).toBe('提出済み');
      });
    });

    test('詳細ダイアログが開ける', async ({ page }) => {
      const rows = await page.locator('[data-testid="weekly-reports-table"] tbody tr').count();
      
      if (rows > 0) {
        // 最初の行の詳細ボタンをクリック
        await page.click('[data-testid="view-details-button"]');
        
        // 詳細ダイアログが表示される
        await expect(page.locator('[data-testid="report-details-dialog"]')).toBeVisible();
        
        // 週報の詳細情報が表示される
        await expect(page.locator('[data-testid="report-week-period"]')).toBeVisible();
        await expect(page.locator('[data-testid="report-status"]')).toBeVisible();
        await expect(page.locator('[data-testid="report-total-hours"]')).toBeVisible();
        
        // ダイアログを閉じる
        await page.click('[data-testid="close-dialog-button"]');
      }
    });
  });

  test.describe('月次レポートタブ', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("月次レポート")');
      await page.waitForSelector('[data-testid="monthly-report-tab"]');
    });

    test('月次サマリーが表示される', async ({ page }) => {
      // 月選択が表示される
      await expect(page.locator('[data-testid="month-picker"]')).toBeVisible();
      
      // サマリーカードが表示される
      await expect(page.locator('[data-testid="total-engineers-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="submission-rate-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-work-hours-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="alerts-count-card"]')).toBeVisible();
    });

    test('部署別統計が表示される', async ({ page }) => {
      // 部署別統計テーブルが表示される
      await expect(page.locator('[data-testid="department-stats-table"]')).toBeVisible();
      
      // テーブルヘッダーを確認
      const headers = await page.locator('[data-testid="department-stats-table"] th').allTextContents();
      expect(headers).toContain('部署');
      expect(headers).toContain('対象者数');
      expect(headers).toContain('提出率');
      expect(headers).toContain('平均労働時間');
    });

    test('月次レポートをエクスポートできる', async ({ page }) => {
      // エクスポートボタンをクリック
      await page.click('[data-testid="export-monthly-report-button"]');
      
      // エクスポートオプションが表示される
      await expect(page.locator('[data-testid="export-options-dialog"]')).toBeVisible();
      
      // PDFオプションが選択できる
      await expect(page.locator('[data-testid="export-pdf-option"]')).toBeVisible();
      
      // ダイアログを閉じる
      await page.click('[data-testid="cancel-export-button"]');
    });
  });

  test.describe('アラート設定タブ', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("アラート設定")');
      await page.waitForSelector('[data-testid="alert-settings-tab"]');
    });

    test('アラート設定が表示される', async ({ page }) => {
      // 各設定項目が表示される
      await expect(page.locator('[data-testid="weekly-hours-limit-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="weekly-change-limit-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="holiday-work-limit-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="monthly-overtime-limit-input"]')).toBeVisible();
      
      // 現在の設定値が表示される
      const weeklyHoursLimit = await page.locator('[data-testid="weekly-hours-limit-input"]').inputValue();
      expect(parseInt(weeklyHoursLimit)).toBeGreaterThan(0);
    });

    test('アラート設定を更新できる', async ({ page }) => {
      // 週間労働時間上限を変更
      await page.fill('[data-testid="weekly-hours-limit-input"]', '65');
      
      // 保存ボタンをクリック
      await page.click('[data-testid="save-alert-settings-button"]');
      
      // 確認ダイアログが表示される
      await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
      
      // 確認ボタンをクリック
      await page.click('[data-testid="confirm-save-button"]');
      
      // 成功メッセージが表示される
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
      
      // 値が更新されていることを確認
      await page.reload();
      const updatedValue = await page.locator('[data-testid="weekly-hours-limit-input"]').inputValue();
      expect(updatedValue).toBe('65');
    });

    test('無効な値は保存できない', async ({ page }) => {
      // 無効な値を入力
      await page.fill('[data-testid="weekly-hours-limit-input"]', '-10');
      
      // 保存ボタンをクリック
      await page.click('[data-testid="save-alert-settings-button"]');
      
      // エラーメッセージが表示される
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    });
  });

  test.describe('権限管理', () => {
    test('管理者以外はアクセスできない', async ({ page }) => {
      // 一般ユーザーとしてログイン
      await authHelper.logout();
      await authHelper.loginAsUser();
      
      // 週報管理画面にアクセス
      await page.goto('/admin/weekly-reports');
      
      // アクセス拒否またはリダイレクトされることを確認
      await expect(page).toHaveURL(/\/(login|403|dashboard)/);
    });

    test('マネージャー権限でアクセスできる', async ({ page }) => {
      // マネージャーとしてログイン
      await authHelper.logout();
      await authHelper.loginAsManager();
      
      // 週報管理画面にアクセス
      await page.goto('/admin/weekly-reports');
      
      // 画面が表示されることを確認
      await expect(page.locator('[data-testid="admin-weekly-reports-page"]')).toBeVisible();
      
      // ただし、アラート設定タブは非表示または無効
      const alertTab = page.locator('[role="tab"]:has-text("アラート設定")');
      const isDisabled = await alertTab.getAttribute('aria-disabled');
      
      if (await alertTab.isVisible()) {
        expect(isDisabled).toBe('true');
      }
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイル表示でも正しく動作する', async ({ page }) => {
      // ビューポートをモバイルサイズに変更
      await page.setViewportSize({ width: 375, height: 667 });
      
      // タブがスクロール可能になることを確認
      const tabList = page.locator('[role="tablist"]');
      await expect(tabList).toHaveCSS('overflow-x', 'auto');
      
      // データテーブルが横スクロール可能になることを確認
      await page.click('[role="tab"]:has-text("未提出者管理")');
      const table = page.locator('[data-testid="unsubmitted-table"]');
      const tableContainer = table.locator('..');
      await expect(tableContainer).toHaveCSS('overflow-x', 'auto');
    });
  });

  test.describe('パフォーマンス', () => {
    test('大量データでも適切に表示される', async ({ page }) => {
      // 未提出者管理タブで大量データをテスト
      await page.click('[role="tab"]:has-text("未提出者管理")');
      
      // ページネーションが表示される
      const pagination = page.locator('[data-testid="pagination"]');
      
      if (await pagination.isVisible()) {
        // 最後のページに移動
        await page.click('[data-testid="last-page-button"]');
        
        // データが表示されることを確認
        await expect(page.locator('[data-testid="unsubmitted-table"] tbody tr')).toHaveCount(/.*/);
        
        // 最初のページに戻る
        await page.click('[data-testid="first-page-button"]');
      }
    });
  });
});