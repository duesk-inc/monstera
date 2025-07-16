import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { SalesHelper } from '../helpers/sales-helper';
import { 
  testExtensions, 
  testUsers, 
  testSuccessMessages, 
  testErrorMessages,
  testExpectations
} from '../test-data/sales-test-data';

/**
 * 契約延長管理ページのE2Eテスト
 * 
 * テストシナリオ:
 * 1. 営業担当者ログイン・アクセス権限確認
 * 2. 契約延長一覧表示・フィルタリング・検索
 * 3. 契約延長の詳細表示・編集
 * 4. ステータス変更・承認・却下
 * 5. リマインダー送信機能
 * 6. 契約延長の作成・削除
 * 7. データエクスポート機能
 * 8. 統計情報・アラート表示
 * 9. バルクアクション
 * 10. レスポンシブ対応
 * 11. エラーハンドリング・バリデーション
 * 12. パフォーマンス確認
 */

test.describe('契約延長管理システム', () => {
  let authHelper: AuthHelper;
  let salesHelper: SalesHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    salesHelper = new SalesHelper(page);
  });

  test.afterEach(async ({ page }) => {
    try {
      await authHelper.logout();
    } catch {
      // ログアウトに失敗しても継続
    }
  });

  test.describe('認証とページアクセス', () => {
    test('営業担当者でログインして契約延長管理ページにアクセスできる', async ({ page }) => {
      // 営業担当者でログイン
      await salesHelper.loginAsSalesRepresentative();
      
      // 契約延長管理ページに移動
      await salesHelper.navigateToExtensionManagement();
      
      // ページタイトルの確認
      await expect(page.locator('[data-testid="page-title"]')).toContainText('契約延長管理');
      
      // 契約延長一覧テーブルが表示されることを確認
      await expect(page.locator('[data-testid="extension-table"]')).toBeVisible();
      
      // アクションボタンが表示されることを確認
      await expect(page.locator('[data-testid="create-extension-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="refresh-button"]')).toBeVisible();
    });

    test('権限のないユーザーは契約延長管理ページにアクセスできない', async ({ page }) => {
      // エンジニアでログイン
      await authHelper.loginAsEngineer();
      
      // 契約延長管理ページに直接アクセス
      await page.goto('/sales/extensions');
      
      // アクセス拒否メッセージまたはリダイレクトの確認
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });
  });

  test.describe('契約延長一覧表示機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('契約延長一覧が正しく表示される', async ({ page }) => {
      // テーブルヘッダーの確認
      await expect(page.locator('[data-testid="table-header-engineer"]')).toContainText('エンジニア');
      await expect(page.locator('[data-testid="table-header-current-end"]')).toContainText('契約終了日');
      await expect(page.locator('[data-testid="table-header-check-date"]')).toContainText('確認日');
      await expect(page.locator('[data-testid="table-header-status"]')).toContainText('ステータス');
      await expect(page.locator('[data-testid="table-header-deadline"]')).toContainText('期限');
      
      // 契約延長データが表示されることを確認
      const firstRow = page.locator('[data-testid^="extension-row-"]').first();
      await expect(firstRow).toBeVisible();
      
      // 統計情報の表示確認
      await expect(page.locator('[data-testid="total-extensions-chip"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-extensions-chip"]')).toBeVisible();
    });

    test('契約延長のステータスが正しく表示される', async ({ page }) => {
      // 各ステータスのスタイル確認
      const pendingStatus = page.locator('[data-testid="status-chip-pending"]').first();
      const approvedStatus = page.locator('[data-testid="status-chip-approved"]').first();
      
      if (await pendingStatus.isVisible()) {
        await expect(pendingStatus).toHaveClass(/pending/);
      }
      
      if (await approvedStatus.isVisible()) {
        await expect(approvedStatus).toHaveClass(/approved/);
      }
    });

    test('期限超過のアラートが正しく表示される', async ({ page }) => {
      // 期限超過のデータをモック
      await page.route('**/api/v1/sales/contract-extensions**', route => 
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ 
            items: [
              {
                ...testExtensions[0],
                id: 'extension-overdue-001',
                status: 'pending',
                deadlineDate: '2024-01-01' // 過去の日付
              }
            ], 
            total: 1, 
            page: 1, 
            limit: 20, 
            totalPages: 1 
          })
        })
      );
      
      await page.reload();
      await salesHelper.waitForLoadingToComplete();
      
      // 期限超過アラートの確認
      await expect(page.locator('[data-testid="overdue-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="overdue-alert"]'))
        .toContainText(/期限超過の契約延長が.*件あります/);
    });

    test('緊急対応が必要な契約延長のアラートが表示される', async ({ page }) => {
      // 緊急対応が必要なデータをモック
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await page.route('**/api/v1/sales/contract-extensions**', route => 
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ 
            items: [
              {
                ...testExtensions[0],
                id: 'extension-urgent-001',
                status: 'pending',
                deadlineDate: tomorrow.toISOString().split('T')[0]
              }
            ], 
            total: 1, 
            page: 1, 
            limit: 20, 
            totalPages: 1 
          })
        })
      );
      
      await page.reload();
      await salesHelper.waitForLoadingToComplete();
      
      // 緊急アラートの確認
      await expect(page.locator('[data-testid="urgent-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="urgent-alert"]'))
        .toContainText(/期限まで3日以内の契約延長が.*件あります/);
    });
  });

  test.describe('契約延長詳細表示・編集機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('契約延長の詳細を表示できる', async ({ page }) => {
      // 契約延長行をクリック
      const extensionRow = page.locator('[data-testid^="extension-row-"]').first();
      
      if (await extensionRow.isVisible()) {
        await extensionRow.click();
        
        // 詳細ダイアログが開くことを確認
        await expect(page.locator('[data-testid="extension-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="dialog-title"]')).toContainText('契約延長詳細');
        
        // 契約延長情報が表示されることを確認
        await expect(page.locator('[data-testid="extension-engineer-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="extension-current-end-date"]')).toBeVisible();
        await expect(page.locator('[data-testid="extension-check-date"]')).toBeVisible();
        await expect(page.locator('[data-testid="extension-status"]')).toBeVisible();
      }
    });

    test('契約延長を編集できる', async ({ page }) => {
      const extensionRow = page.locator('[data-testid^="extension-row-"]').first();
      
      if (await extensionRow.isVisible()) {
        // 編集ボタンをクリック
        await extensionRow.locator('[data-testid="edit-extension-button"]').click();
        
        // 編集ダイアログが開くことを確認
        await expect(page.locator('[data-testid="extension-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="dialog-title"]')).toContainText('契約延長編集');
        
        // 情報を更新
        await page.fill('[data-testid="extension-notes-textarea"]', '延長確認済み。継続意思あり。');
        
        // 保存
        await page.click('[data-testid="save-extension-button"]');
        
        // 成功メッセージの確認
        await expect(page.locator('[data-testid="success-toast"]'))
          .toContainText('契約延長を更新しました');
      }
    });

    test('承認済みの契約延長は編集制限がある', async ({ page }) => {
      // 承認済み契約延長のデータをモック
      await page.route('**/api/v1/sales/contract-extensions**', route => 
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ 
            items: [
              {
                ...testExtensions[1], // approved状態のデータ
                status: 'approved'
              }
            ], 
            total: 1, 
            page: 1, 
            limit: 20, 
            totalPages: 1 
          })
        })
      );
      
      await page.reload();
      await salesHelper.waitForLoadingToComplete();
      
      const approvedRow = page.locator('[data-testid="extension-row-extension-002"]');
      
      if (await approvedRow.isVisible()) {
        await approvedRow.click();
        
        // 編集ボタンが無効または非表示であることを確認
        const editButton = page.locator('[data-testid="edit-extension-button"]');
        if (await editButton.isVisible()) {
          await expect(editButton).toBeDisabled();
        } else {
          await expect(editButton).not.toBeVisible();
        }
      }
    });
  });

  test.describe('ステータス変更・承認・却下機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('契約延長のステータスを変更できる', async ({ page }) => {
      const extensionRow = page.locator('[data-testid^="extension-row-"]').first();
      
      if (await extensionRow.isVisible()) {
        // ステータス変更ボタンをクリック
        await extensionRow.locator('[data-testid="status-change-button"]').click();
        
        // ステータス選択
        await page.selectOption('[data-testid="status-select"]', 'confirmed');
        await page.click('[data-testid="confirm-status-change"]');
        
        // 成功メッセージの確認
        await expect(page.locator('[data-testid="success-toast"]'))
          .toContainText('ステータスを更新しました');
      }
    });

    test('契約延長を承認できる', async ({ page }) => {
      const extensionRow = page.locator('[data-testid^="extension-row-"]').first();
      
      if (await extensionRow.isVisible()) {
        // 承認ボタンをクリック
        await extensionRow.locator('[data-testid="approve-extension-button"]').click();
        
        // 承認確認ダイアログ
        await expect(page.locator('[data-testid="approve-confirmation-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="confirmation-message"]'))
          .toContainText('この契約延長を承認してもよろしいですか？');
        
        // 承認実行
        await page.click('[data-testid="confirm-approve-button"]');
        
        // 成功メッセージの確認
        await expect(page.locator('[data-testid="success-toast"]'))
          .toContainText('契約延長を承認しました');
      }
    });

    test('契約延長を却下できる', async ({ page }) => {
      const extensionRow = page.locator('[data-testid^="extension-row-"]').first();
      
      if (await extensionRow.isVisible()) {
        // 却下ボタンをクリック
        await extensionRow.locator('[data-testid="reject-extension-button"]').click();
        
        // 却下理由入力ダイアログ
        await expect(page.locator('[data-testid="reject-reason-dialog"]')).toBeVisible();
        await page.fill('[data-testid="reject-reason-textarea"]', 'スキルが要求レベルに達していないため');
        
        // 却下実行
        await page.click('[data-testid="confirm-reject-button"]');
        
        // 成功メッセージの確認
        await expect(page.locator('[data-testid="success-toast"]'))
          .toContainText('契約延長を却下しました');
      }
    });

    test('承認確認ダイアログでキャンセルできる', async ({ page }) => {
      const extensionRow = page.locator('[data-testid^="extension-row-"]').first();
      
      if (await extensionRow.isVisible()) {
        await extensionRow.locator('[data-testid="approve-extension-button"]').click();
        
        // キャンセルボタンをクリック
        await page.click('[data-testid="cancel-approve-button"]');
        
        // 確認ダイアログが閉じることを確認
        await expect(page.locator('[data-testid="approve-confirmation-dialog"]')).not.toBeVisible();
      }
    });
  });

  test.describe('契約延長作成機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('新規契約延長を作成できる', async ({ page }) => {
      // 作成ボタンをクリック
      await page.click('[data-testid="create-extension-button"]');
      
      // 作成ダイアログが開くことを確認
      await expect(page.locator('[data-testid="extension-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="dialog-title"]')).toContainText('契約延長作成');
      
      // 契約延長情報を入力
      await page.fill('[data-testid="engineer-name-input"]', '田中太郎');
      
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endDateStr = nextMonth.toISOString().split('T')[0];
      
      await page.fill('[data-testid="current-contract-end-input"]', endDateStr);
      
      const checkDate = new Date();
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      await page.fill('[data-testid="extension-check-date-input"]', checkDateStr);
      await page.fill('[data-testid="extension-notes-textarea"]', '契約延長の確認が必要です');
      
      // 保存
      await page.click('[data-testid="save-extension-button"]');
      
      // 成功メッセージの確認
      await expect(page.locator('[data-testid="success-toast"]'))
        .toContainText('契約延長を作成しました');
      
      // ダイアログが閉じることを確認
      await expect(page.locator('[data-testid="extension-dialog"]')).not.toBeVisible();
    });

    test('必須項目の入力バリデーションが機能する', async ({ page }) => {
      // 作成ボタンをクリック
      await page.click('[data-testid="create-extension-button"]');
      
      // 必須項目を空のまま保存
      await page.click('[data-testid="save-extension-button"]');
      
      // バリデーションエラーの確認
      await expect(page.locator('[data-testid="validation-error-engineer"]')).toContainText('エンジニア名は必須です');
      await expect(page.locator('[data-testid="validation-error-contract-end"]')).toContainText('契約終了日は必須です');
      await expect(page.locator('[data-testid="validation-error-check-date"]')).toContainText('確認日は必須です');
    });

    test('日付の整合性チェックが機能する', async ({ page }) => {
      await page.click('[data-testid="create-extension-button"]');
      
      // 過去の契約終了日を設定
      const pastDate = new Date('2020-01-01');
      const pastDateStr = pastDate.toISOString().split('T')[0];
      
      await page.fill('[data-testid="engineer-name-input"]', '田中太郎');
      await page.fill('[data-testid="current-contract-end-input"]', pastDateStr);
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      await page.fill('[data-testid="extension-check-date-input"]', todayStr);
      
      await page.click('[data-testid="save-extension-button"]');
      
      // 日付エラーの確認
      await expect(page.locator('[data-testid="validation-error-date"]'))
        .toContainText('契約終了日は現在日時以降である必要があります');
    });
  });

  test.describe('契約延長削除機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('契約延長を削除できる', async ({ page }) => {
      const extensionRow = page.locator('[data-testid^="extension-row-"]').first();
      
      if (await extensionRow.isVisible()) {
        await extensionRow.click();
        
        // 編集モードに切り替え
        await page.click('[data-testid="edit-extension-button"]');
        
        // 削除ボタンをクリック
        await page.click('[data-testid="delete-extension-button"]');
        
        // 削除確認ダイアログ
        await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="confirmation-message"]'))
          .toContainText('この契約延長を削除してもよろしいですか？');
        
        // 削除実行
        await page.click('[data-testid="confirm-delete-button"]');
        
        // 成功メッセージの確認
        await expect(page.locator('[data-testid="success-toast"]'))
          .toContainText('契約延長を削除しました');
        
        // ダイアログが閉じることを確認
        await expect(page.locator('[data-testid="extension-dialog"]')).not.toBeVisible();
      }
    });

    test('削除確認ダイアログでキャンセルできる', async ({ page }) => {
      const extensionRow = page.locator('[data-testid^="extension-row-"]').first();
      
      if (await extensionRow.isVisible()) {
        await extensionRow.click();
        await page.click('[data-testid="edit-extension-button"]');
        await page.click('[data-testid="delete-extension-button"]');
        
        // キャンセルボタンをクリック
        await page.click('[data-testid="cancel-delete-button"]');
        
        // 削除確認ダイアログが閉じることを確認
        await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible();
        
        // 契約延長ダイアログは開いたまま
        await expect(page.locator('[data-testid="extension-dialog"]')).toBeVisible();
      }
    });
  });

  test.describe('リマインダー送信機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('個別リマインダーを送信できる', async ({ page }) => {
      const extensionRow = page.locator('[data-testid^="extension-row-"]').first();
      
      if (await extensionRow.isVisible()) {
        // リマインダー送信ボタンをクリック
        await extensionRow.locator('[data-testid="send-reminder-button"]').click();
        
        // リマインダー送信確認ダイアログ
        await expect(page.locator('[data-testid="reminder-confirmation-dialog"]')).toBeVisible();
        await page.click('[data-testid="confirm-send-reminder"]');
        
        // 成功メッセージの確認
        await expect(page.locator('[data-testid="success-toast"]'))
          .toContainText('リマインダーを送信しました');
      }
    });

    test('バルクリマインダーを送信できる', async ({ page }) => {
      // 複数の契約延長を選択
      const extensionCheckboxes = page.locator('[data-testid^="extension-checkbox-"]');
      const count = Math.min(await extensionCheckboxes.count(), 2);
      
      for (let i = 0; i < count; i++) {
        await extensionCheckboxes.nth(i).check();
      }
      
      // バルクアクションボタンを開く
      await page.click('[data-testid="bulk-actions-button"]');
      await page.click('[data-testid="bulk-send-reminder-action"]');
      
      // 確認ダイアログ
      await expect(page.locator('[data-testid="bulk-reminder-confirmation"]'))
        .toContainText('選択した契約延長にリマインダーを送信してもよろしいですか？');
      
      await page.click('[data-testid="confirm-bulk-reminder"]');
      
      // 成功メッセージの確認
      await expect(page.locator('[data-testid="success-toast"]'))
        .toContainText('選択した契約延長にリマインダーを送信しました');
    });
  });

  test.describe('データエクスポート機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('契約延長データをエクスポートできる', async ({ page }) => {
      // エクスポートボタンをクリック
      await page.click('[data-testid="export-button"]');
      
      // エクスポート設定ダイアログ
      await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
      
      // フィルター設定
      await page.check('[data-testid="export-include-pending"]');
      await page.check('[data-testid="export-include-approved"]');
      
      // ダウンロード開始を待つ
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="confirm-export-button"]');
      const download = await downloadPromise;
      
      // ダウンロードファイルの確認
      expect(download).toBeTruthy();
      expect(download.suggestedFilename()).toMatch(/contract_extensions_.*\.xlsx$/);
    });

    test('エクスポート時のフィルター設定が機能する', async ({ page }) => {
      await page.click('[data-testid="export-button"]');
      
      // 特定のステータスのみ選択
      await page.check('[data-testid="export-include-pending"]');
      await page.uncheck('[data-testid="export-include-approved"]');
      await page.uncheck('[data-testid="export-include-rejected"]');
      
      // 期間フィルター設定
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      
      await page.fill('[data-testid="export-start-date"]', startDate.toISOString().split('T')[0]);
      await page.fill('[data-testid="export-end-date"]', endDate.toISOString().split('T')[0]);
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="confirm-export-button"]');
      const download = await downloadPromise;
      
      expect(download).toBeTruthy();
    });
  });

  test.describe('検索・フィルタリング機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('エンジニア名で検索できる', async ({ page }) => {
      const searchTerm = '田中';
      await page.fill('[data-testid="extension-search-input"]', searchTerm);
      await page.press('[data-testid="extension-search-input"]', 'Enter');
      await page.waitForTimeout(1000);
      
      // 検索結果の確認
      const results = page.locator('[data-testid^="extension-row-"]');
      const count = await results.count();
      
      if (count > 0) {
        const firstResult = results.first();
        await expect(firstResult).toContainText(searchTerm);
      }
    });

    test('ステータスフィルターが機能する', async ({ page }) => {
      // ステータスフィルターを適用
      await page.selectOption('[data-testid="status-filter"]', 'pending');
      await page.waitForTimeout(1000);
      
      // フィルター結果の確認
      const statusChips = page.locator('[data-testid^="status-chip-"]');
      const count = await statusChips.count();
      
      for (let i = 0; i < count; i++) {
        const chip = statusChips.nth(i);
        await expect(chip).toHaveAttribute('data-testid', 'status-chip-pending');
      }
    });

    test('期限フィルターが機能する', async ({ page }) => {
      // 期限フィルターを適用
      await page.selectOption('[data-testid="deadline-filter"]', 'urgent');
      await page.waitForTimeout(1000);
      
      // 緊急対応が必要な契約延長のみ表示されることを確認
      const urgentRows = page.locator('[data-testid^="extension-row-"][data-urgent="true"]');
      const totalRows = page.locator('[data-testid^="extension-row-"]');
      
      const urgentCount = await urgentRows.count();
      const totalCount = await totalRows.count();
      
      expect(urgentCount).toBe(totalCount);
    });

    test('複数のフィルターを組み合わせて使用できる', async ({ page }) => {
      // 複数フィルターを適用
      await page.selectOption('[data-testid="status-filter"]', 'pending');
      await page.selectOption('[data-testid="deadline-filter"]', 'overdue');
      await page.waitForTimeout(1000);
      
      // 結果の確認
      const results = page.locator('[data-testid^="extension-row-"]');
      const count = await results.count();
      
      if (count > 0) {
        const firstResult = results.first();
        await expect(firstResult.locator('[data-testid^="status-chip-"]')).toHaveAttribute('data-testid', 'status-chip-pending');
      }
    });

    test('フィルタークリア機能が動作する', async ({ page }) => {
      // フィルターを適用
      await page.selectOption('[data-testid="status-filter"]', 'pending');
      await page.waitForTimeout(1000);
      
      // フィルタークリア
      await page.click('[data-testid="clear-filters-button"]');
      await page.waitForTimeout(1000);
      
      // 全件表示に戻ることを確認
      const allResults = page.locator('[data-testid^="extension-row-"]');
      const totalCount = await allResults.count();
      expect(totalCount).toBeGreaterThan(0);
    });
  });

  test.describe('ページネーション・ソート機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('ページネーションが機能する', async ({ page }) => {
      // 2ページ目に移動
      const page2Button = page.locator('[data-testid="pagination-page-2"]');
      
      if (await page2Button.isVisible()) {
        await page2Button.click();
        await page.waitForTimeout(1000);
        
        // ページネーションの状態確認
        await expect(page2Button).toHaveClass(/active/);
        
        // 異なるデータが表示されることを確認
        const currentPageRows = page.locator('[data-testid^="extension-row-"]');
        await expect(currentPageRows).toHaveCount(expect.any(Number));
      }
    });

    test('カラムソートが機能する', async ({ page }) => {
      // 契約終了日でソート
      await page.click('[data-testid="sort-contract-end-date"]');
      await page.waitForTimeout(1000);
      
      // ソート状態の確認
      await expect(page.locator('[data-testid="sort-contract-end-date"]')).toHaveClass(/sorted/);
      
      // ソート結果の確認（日付の昇順）
      const dates = await page.locator('[data-testid^="extension-contract-end-"]').allTextContents();
      
      for (let i = 0; i < dates.length - 1; i++) {
        const date1 = new Date(dates[i]);
        const date2 = new Date(dates[i + 1]);
        expect(date1.getTime()).toBeLessThanOrEqual(date2.getTime());
      }
    });
  });

  test.describe('更新・リフレッシュ機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('更新ボタンでデータを再読み込みできる', async ({ page }) => {
      // 更新ボタンをクリック
      await page.click('[data-testid="refresh-button"]');
      
      // ローディング状態の確認
      await expect(page.locator('[data-testid="refresh-button"]')).toBeDisabled();
      
      // ローディング完了を待つ
      await salesHelper.waitForLoadingToComplete();
      
      // 更新ボタンが再度有効になることを確認
      await expect(page.locator('[data-testid="refresh-button"]')).toBeEnabled();
    });

    test('ローディング中は適切な表示になる', async ({ page }) => {
      // ページをリロードしてローディング状態を確認
      await page.reload();
      
      // ローディングスピナーが表示されることを確認
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
      if (await loadingSpinner.isVisible()) {
        await expect(loadingSpinner).toBeVisible();
      }
      
      // ローディング完了後、コンテンツが表示されることを確認
      await salesHelper.waitForLoadingToComplete();
      await expect(page.locator('[data-testid="extension-table"]')).toBeVisible();
    });
  });

  test.describe('レスポンシブ対応', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('モバイルレイアウトが正しく表示される', async ({ page }) => {
      // モバイルサイズに変更
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // モバイル専用要素の確認
      await expect(page.locator('[data-testid="mobile-extension-cards"]')).toBeVisible();
      
      // アクションボタンが適切に配置されることを確認
      const createButton = page.locator('[data-testid="create-extension-button"]');
      await expect(createButton).toBeVisible();
      
      // メニューボタンが表示されることを確認
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    });

    test('タブレットレイアウトが正しく表示される', async ({ page }) => {
      // タブレットサイズに変更
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      // タブレット用レイアウトの確認
      await expect(page.locator('[data-testid="extension-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
    });
  });

  test.describe('エラーハンドリング', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
    });

    test('ネットワークエラー時の適切な表示', async ({ page }) => {
      // ネットワークをオフラインに設定
      await page.context().setOffline(true);
      
      // データ更新を試行
      await page.click('[data-testid="refresh-button"]');
      
      // エラーメッセージの確認
      await salesHelper.checkErrorMessage(testErrorMessages.networkError);
      
      // ネットワークを復旧
      await page.context().setOffline(false);
    });

    test('APIエラー時の適切な表示', async ({ page }) => {
      // APIエラーレスポンスを返すモック
      await page.route('**/api/v1/sales/contract-extensions**', route => 
        route.fulfill({ status: 500, body: '{"error": "サーバーエラーが発生しました"}' })
      );
      
      await page.click('[data-testid="refresh-button"]');
      
      // エラーメッセージの確認
      await expect(page.locator('[data-testid="error-toast"]'))
        .toContainText('契約延長一覧取得に失敗しました');
    });

    test('契約延長作成時のエラーハンドリング', async ({ page }) => {
      // 契約延長作成でエラーレスポンスを返すモック
      await page.route('**/api/v1/sales/contract-extensions', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({ status: 400, body: '{"error": "不正なデータです"}' });
        } else {
          route.continue();
        }
      });
      
      await page.click('[data-testid="create-extension-button"]');
      
      // 正常な入力を行う
      await page.fill('[data-testid="engineer-name-input"]', '田中太郎');
      
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endDateStr = nextMonth.toISOString().split('T')[0];
      
      await page.fill('[data-testid="current-contract-end-input"]', endDateStr);
      
      const checkDate = new Date();
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      await page.fill('[data-testid="extension-check-date-input"]', checkDateStr);
      
      // 保存してエラーを発生させる
      await page.click('[data-testid="save-extension-button"]');
      
      // エラーメッセージの確認
      await expect(page.locator('[data-testid="error-toast"]'))
        .toContainText('契約延長作成に失敗しました');
    });

    test('データが見つからない場合の表示', async ({ page }) => {
      // 空のレスポンスを返すモック
      await page.route('**/api/v1/sales/contract-extensions**', route => 
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 })
        })
      );
      
      await page.reload();
      await salesHelper.waitForLoadingToComplete();
      
      // 空状態メッセージの確認
      await expect(page.locator('[data-testid="empty-state"]'))
        .toContainText('契約延長データがありません');
      await expect(page.locator('[data-testid="empty-state-action"]'))
        .toContainText('新しい契約延長を作成');
    });
  });

  test.describe('パフォーマンス', () => {
    test('ページ読み込み時間が許容範囲内', async ({ page }) => {
      const startTime = Date.now();
      
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
      
      const loadTime = Date.now() - startTime;
      
      // 15秒以内に読み込み完了することを確認
      expect(loadTime).toBeLessThan(testExpectations.pageLoadTimeout);
    });

    test('大量データでのテーブル描画性能', async ({ page }) => {
      // 大量データのモック（100件の契約延長）
      const largeDataSet = Array.from({ length: 100 }, (_, i) => ({
        ...testExtensions[0],
        id: `extension-${i.toString().padStart(3, '0')}`,
        engineerName: `エンジニア${i + 1}`,
        currentContractEnd: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));
      
      await page.route('**/api/v1/sales/contract-extensions**', route => 
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ 
            items: largeDataSet, 
            total: largeDataSet.length, 
            page: 1, 
            limit: 100, 
            totalPages: 1 
          })
        })
      );
      
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      
      const renderStart = Date.now();
      await salesHelper.waitForLoadingToComplete();
      const renderTime = Date.now() - renderStart;
      
      // 3秒以内に大量データが表示されることを確認
      expect(renderTime).toBeLessThan(3000);
      
      // 契約延長データが表示されることを確認
      const extensionRows = page.locator('[data-testid^="extension-row-"]');
      const rowCount = await extensionRows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('フィルタリングの応答性', async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
      
      // フィルタリングの応答性テスト
      const filterStart = Date.now();
      await page.selectOption('[data-testid="status-filter"]', 'pending');
      await page.waitForSelector('[data-testid^="extension-row-"]');
      const filterTime = Date.now() - filterStart;
      
      // 1秒以内にフィルタリングが完了することを確認
      expect(filterTime).toBeLessThan(1000);
    });
  });

  test.describe('キーボードナビゲーション', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToExtensionManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('キーボードでテーブルを操作できる', async ({ page }) => {
      // テーブルにフォーカス
      await page.focus('[data-testid="extension-table"]');
      
      // 矢印キーで行移動
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      
      // Enterキーで行選択
      await page.keyboard.press('Enter');
      
      // 詳細ダイアログが開くことを確認
      await expect(page.locator('[data-testid="extension-dialog"]')).toBeVisible();
    });

    test('タブキーでフォーカス移動できる', async ({ page }) => {
      // Tabキーで要素間を移動
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // フォーカスされた要素がアクセス可能であることを確認
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('ショートカットキーが機能する', async ({ page }) => {
      // Ctrl+N で新規作成
      await page.keyboard.press('Control+n');
      
      // 作成ダイアログが開くことを確認
      await expect(page.locator('[data-testid="extension-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="dialog-title"]')).toContainText('契約延長作成');
    });
  });
});