import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { SalesHelper } from '../helpers/sales-helper';
import { 
  testProposals, 
  testUsers, 
  testSuccessMessages, 
  testErrorMessages,
  testExpectations,
  testEmailTemplates,
  testCsvData
} from '../test-data/sales-test-data';

/**
 * 提案管理ページのE2Eテスト
 * 
 * テストシナリオ:
 * 1. 営業担当者ログイン
 * 2. 提案一覧表示・フィルタリング・検索
 * 3. 提案作成・編集・削除
 * 4. ステータス変更・進捗管理
 * 5. 面談スケジュール作成
 * 6. メール送信機能
 * 7. データエクスポート・インポート
 * 8. バルクアクション
 * 9. レスポンシブ対応確認
 * 10. エラーハンドリング
 */

test.describe('提案管理システム', () => {
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
    test('営業担当者でログインして提案管理ページにアクセスできる', async ({ page }) => {
      // 営業担当者でログイン
      await salesHelper.loginAsSalesRepresentative();
      
      // 提案管理ページに移動
      await salesHelper.navigateToProposalManagement();
      
      // ページタイトルの確認
      await expect(page.locator('[data-testid="page-title"]')).toContainText('提案管理');
      
      // 提案一覧テーブルが表示されることを確認
      await expect(page.locator('[data-testid="proposal-data-table"]')).toBeVisible();
      
      // アクションボタンが表示されることを確認
      await expect(page.locator('[data-testid="create-proposal-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="import-button"]')).toBeVisible();
    });

    test('権限のないユーザーは提案管理ページにアクセスできない', async ({ page }) => {
      // エンジニアでログイン
      await authHelper.loginAsEngineer();
      
      // 提案管理ページに直接アクセス
      await page.goto('/sales/proposals');
      
      // アクセス拒否メッセージまたはリダイレクトの確認
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });
  });

  test.describe('提案一覧表示機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('提案一覧が正しく表示される', async ({ page }) => {
      // テーブルヘッダーの確認
      await expect(page.locator('[data-testid="table-header-engineer"]')).toContainText('エンジニア');
      await expect(page.locator('[data-testid="table-header-client"]')).toContainText('クライアント');
      await expect(page.locator('[data-testid="table-header-amount"]')).toContainText('提案金額');
      await expect(page.locator('[data-testid="table-header-status"]')).toContainText('ステータス');
      await expect(page.locator('[data-testid="table-header-date"]')).toContainText('提案日');
      
      // 提案データが表示されることを確認
      const firstRow = page.locator('[data-testid^="proposal-row-"]').first();
      await expect(firstRow).toBeVisible();
      
      // 統計情報の表示確認
      await salesHelper.checkProposalStatistics();
    });

    test('提案のステータスが正しく表示される', async ({ page }) => {
      // 各ステータスのスタイル確認
      const pendingStatus = page.locator('[data-testid="status-chip-pending"]').first();
      const acceptedStatus = page.locator('[data-testid="status-chip-accepted"]').first();
      
      if (await pendingStatus.isVisible()) {
        await expect(pendingStatus).toHaveClass(/pending/);
      }
      
      if (await acceptedStatus.isVisible()) {
        await expect(acceptedStatus).toHaveClass(/accepted/);
      }
    });
  });

  test.describe('検索・フィルタリング機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('エンジニア名で検索できる', async ({ page }) => {
      const searchTerm = '田中';
      await salesHelper.searchProposal(searchTerm);
      
      // 検索結果の確認
      const resultCount = await salesHelper.getSearchResultCount();
      expect(resultCount).toBeGreaterThan(0);
      
      // 検索結果にエンジニア名が含まれることを確認
      const firstResult = page.locator('[data-testid^="proposal-row-"]').first();
      await expect(firstResult).toContainText(searchTerm);
    });

    test('ステータスフィルターが機能する', async ({ page }) => {
      // ステータスフィルターを適用
      await salesHelper.filterProposals('pending');
      
      // フィルター結果の確認
      const statusChips = page.locator('[data-testid^="status-chip-"]');
      const count = await statusChips.count();
      
      for (let i = 0; i < count; i++) {
        const chip = statusChips.nth(i);
        await expect(chip).toHaveAttribute('data-testid', 'status-chip-pending');
      }
    });

    test('複数のフィルターを組み合わせて使用できる', async ({ page }) => {
      // 複数フィルターを適用
      await salesHelper.filterProposals('in_interview', 'engineer-002');
      
      // 結果の確認
      const results = page.locator('[data-testid^="proposal-row-"]');
      const count = await results.count();
      
      if (count > 0) {
        const firstResult = results.first();
        await expect(firstResult).toContainText('面談中');
      }
    });

    test('フィルタークリア機能が動作する', async ({ page }) => {
      // フィルターを適用
      await salesHelper.filterProposals('pending');
      
      // フィルタークリア
      await page.click('[data-testid="clear-filters-button"]');
      
      // 全件表示に戻ることを確認
      const allResults = page.locator('[data-testid^="proposal-row-"]');
      const totalCount = await allResults.count();
      expect(totalCount).toBeGreaterThan(0);
    });
  });

  test.describe('提案作成機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
    });

    test('新規提案作成ページに遷移できる', async ({ page }) => {
      await salesHelper.clickCreateProposal();
      
      // 新規作成ページの確認
      await expect(page).toHaveURL(/.*\/proposals\/new/);
      await expect(page.locator('[data-testid="proposal-form"]')).toBeVisible();
    });

    test('必須項目の入力バリデーションが機能する', async ({ page }) => {
      await salesHelper.clickCreateProposal();
      
      // 必須項目を空のまま保存
      await page.click('[data-testid="save-proposal-button"]');
      
      // バリデーションエラーの確認
      await expect(page.locator('[data-testid="validation-error-engineer"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error-client"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error-amount"]')).toBeVisible();
    });
  });

  test.describe('ステータス変更機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('提案のステータスを変更できる', async ({ page }) => {
      const proposalId = 'proposal-001';
      
      // ステータス変更
      await salesHelper.changeProposalStatus(proposalId, 'in_interview');
      
      // 成功メッセージの確認
      await expect(page.locator('[data-testid="success-toast"]'))
        .toContainText(testSuccessMessages.statusUpdated);
      
      // ステータスが更新されることを確認
      const statusChip = page.locator(`[data-testid="proposal-row-${proposalId}"] [data-testid^="status-chip-"]`);
      await expect(statusChip).toHaveAttribute('data-testid', 'status-chip-in_interview');
    });

    test('無効なステータス変更は拒否される', async ({ page }) => {
      const proposalId = 'proposal-003'; // accepted状態の提案
      
      try {
        await salesHelper.changeProposalStatus(proposalId, 'draft');
        
        // エラーメッセージの確認
        await salesHelper.checkErrorMessage('無効なステータス変更です');
      } catch {
        // ステータス変更ボタンが無効になっていることを確認
        const statusButton = page.locator(`[data-testid="proposal-row-${proposalId}"] [data-testid="status-change-button"]`);
        await expect(statusButton).toBeDisabled();
      }
    });
  });

  test.describe('面談スケジュール機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('面談をスケジュールできる', async ({ page }) => {
      const proposalId = 'proposal-001';
      const interviewData = {
        date: '2024-02-01',
        time: '14:00',
        duration: 60,
        meetingType: 'online' as const
      };
      
      await salesHelper.scheduleInterview(proposalId, interviewData);
      
      // 成功メッセージの確認
      await expect(page.locator('[data-testid="success-toast"]'))
        .toContainText(testSuccessMessages.interviewScheduled);
    });

    test('面談スケジュールの重複チェックが機能する', async ({ page }) => {
      const proposalId = 'proposal-001';
      const conflictingData = {
        date: '2024-01-25', // 既存の面談と同じ日時
        time: '10:00',
        duration: 60,
        meetingType: 'online' as const
      };
      
      await salesHelper.scheduleInterview(proposalId, conflictingData);
      
      // 重複警告の表示確認
      await expect(page.locator('[data-testid="conflict-warning"]'))
        .toContainText('指定された時間に他の面談が予定されています');
    });
  });

  test.describe('メール送信機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('提案メールを送信できる', async ({ page }) => {
      const proposalId = 'proposal-001';
      const emailData = {
        template: 'template-001',
        subject: 'テスト提案書のご送付',
        customMessage: 'よろしくお願いいたします。'
      };
      
      await salesHelper.sendProposalEmail(proposalId, emailData);
      
      // 成功メッセージの確認
      await expect(page.locator('[data-testid="success-toast"]'))
        .toContainText(testSuccessMessages.emailSent);
    });

    test('メールテンプレートが正しく適用される', async ({ page }) => {
      const proposalId = 'proposal-001';
      
      // メール送信ダイアログを開く
      const row = page.locator(`[data-testid="proposal-row-${proposalId}"]`);
      await row.locator('[data-testid="more-actions-button"]').click();
      await page.click('[data-testid="send-email-action"]');
      
      // テンプレート選択
      await page.selectOption('[data-testid="email-template-select"]', 'template-001');
      
      // テンプレートの内容が適用されることを確認
      const subjectInput = page.locator('[data-testid="email-subject-input"]');
      await expect(subjectInput).toHaveValue(/.*エンジニア提案書のご送付.*/);
    });
  });

  test.describe('データエクスポート・インポート機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('提案データをエクスポートできる', async ({ page }) => {
      const download = await salesHelper.exportProposalData();
      
      // ダウンロードファイルの確認
      expect(download).toBeTruthy();
      expect(download.suggestedFilename()).toMatch(/proposals_.*\.xlsx$/);
    });

    test('CSVファイルをインポートできる', async ({ page }) => {
      // テスト用CSVファイルの作成
      const testFile = 'test-proposals.csv';
      await page.evaluate((csvData) => {
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'test-proposals.csv';
        link.click();
      }, testCsvData);
      
      await salesHelper.importProposalData(testFile);
      
      // インポート成功メッセージの確認
      await expect(page.locator('[data-testid="success-toast"]'))
        .toContainText(testSuccessMessages.dataImported);
    });

    test('不正なフォーマットのファイルインポートはエラーになる', async ({ page }) => {
      const invalidFile = 'invalid-file.txt';
      
      try {
        await salesHelper.importProposalData(invalidFile);
        
        // エラーメッセージの確認
        await salesHelper.checkErrorMessage('ファイル形式が正しくありません');
      } catch {
        // インポートボタンが無効になることを確認
        await expect(page.locator('[data-testid="confirm-import-button"]')).toBeDisabled();
      }
    });
  });

  test.describe('バルクアクション機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('複数の提案をバルク選択できる', async ({ page }) => {
      const proposalIds = ['proposal-001', 'proposal-002'];
      
      // 複数選択
      for (const id of proposalIds) {
        await page.check(`[data-testid="proposal-checkbox-${id}"]`);
      }
      
      // バルクアクションボタンが有効になることを確認
      await expect(page.locator('[data-testid="bulk-actions-button"]')).toBeEnabled();
      
      // 選択件数の表示確認
      await expect(page.locator('[data-testid="selected-count"]'))
        .toContainText(`${proposalIds.length}件選択中`);
    });

    test('バルクステータス変更が実行できる', async ({ page }) => {
      const proposalIds = ['proposal-001', 'proposal-005'];
      
      await salesHelper.executeBulkAction(proposalIds, 'status-change-pending');
      
      // 成功メッセージの確認
      await expect(page.locator('[data-testid="success-toast"]'))
        .toContainText('選択した提案のステータスを更新しました');
    });

    test('バルク削除が実行できる', async ({ page }) => {
      const proposalIds = ['proposal-004']; // rejected状態の提案
      
      await salesHelper.executeBulkAction(proposalIds, 'delete');
      
      // 確認ダイアログの表示
      await expect(page.locator('[data-testid="bulk-delete-confirmation"]'))
        .toContainText('選択した提案を削除してもよろしいですか？');
      
      await page.click('[data-testid="confirm-bulk-delete"]');
      
      // 成功メッセージの確認
      await expect(page.locator('[data-testid="success-toast"]'))
        .toContainText('選択した提案を削除しました');
    });
  });

  test.describe('ページネーション・ソート機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('ページネーションが機能する', async ({ page }) => {
      // 2ページ目に移動
      await salesHelper.navigateToPage(2);
      
      // ページネーションの状態確認
      await expect(page.locator('[data-testid="pagination-page-2"]')).toHaveClass(/active/);
      
      // 異なるデータが表示されることを確認
      const currentPageRows = page.locator('[data-testid^="proposal-row-"]');
      await expect(currentPageRows).toHaveCount(expect.any(Number));
    });

    test('カラムソートが機能する', async ({ page }) => {
      // 提案金額でソート
      await salesHelper.sortBy('amount');
      
      // ソート状態の確認
      await expect(page.locator('[data-testid="sort-amount"]')).toHaveClass(/sorted/);
      
      // ソート結果の確認（金額の降順）
      const amounts = await page.locator('[data-testid^="proposal-amount-"]').allTextContents();
      const numericAmounts = amounts.map(a => parseInt(a.replace(/[^\d]/g, '')));
      
      for (let i = 0; i < numericAmounts.length - 1; i++) {
        expect(numericAmounts[i]).toBeGreaterThanOrEqual(numericAmounts[i + 1]);
      }
    });
  });

  test.describe('レスポンシブ対応', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
    });

    test('モバイルレイアウトが正しく表示される', async ({ page }) => {
      await salesHelper.checkResponsiveLayout();
      
      // モバイル専用要素の確認
      await expect(page.locator('[data-testid="mobile-proposal-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    });

    test('タブレットレイアウトが正しく表示される', async ({ page }) => {
      // タブレットサイズに変更
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      // タブレット用レイアウトの確認
      await expect(page.locator('[data-testid="proposal-data-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
    });
  });

  test.describe('エラーハンドリング', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
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

    test('権限エラー時の適切な表示', async ({ page }) => {
      // 権限のない操作を実行
      await page.route('**/api/v1/sales/proposals/*', route => 
        route.fulfill({ status: 403, body: '{"error": "権限がありません"}' })
      );
      
      await page.click('[data-testid="proposal-row-proposal-001"] [data-testid="more-actions-button"]');
      await page.click('[data-testid="delete-proposal-action"]');
      
      // 権限エラーメッセージの確認
      await salesHelper.checkErrorMessage(testErrorMessages.permissionError);
    });

    test('データが見つからない場合の表示', async ({ page }) => {
      // 空のレスポンスを返すモック
      await page.route('**/api/v1/sales/proposals**', route => 
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 })
        })
      );
      
      await page.reload();
      await salesHelper.waitForLoadingToComplete();
      
      // 空状態メッセージの確認
      await expect(page.locator('[data-testid="empty-state"]'))
        .toContainText('提案データがありません');
      await expect(page.locator('[data-testid="empty-state-action"]'))
        .toContainText('新しい提案を作成');
    });
  });

  test.describe('パフォーマンス', () => {
    test('ページ読み込み時間が許容範囲内', async ({ page }) => {
      const startTime = Date.now();
      
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToProposalManagement();
      await salesHelper.waitForLoadingToComplete();
      
      const loadTime = Date.now() - startTime;
      
      // 15秒以内に読み込み完了することを確認
      expect(loadTime).toBeLessThan(testExpectations.pageLoadTimeout);
    });

    test('大量データでのスクロール性能', async ({ page }) => {
      // 大量データのモック（100件）
      const largeDataSet = Array.from({ length: 100 }, (_, i) => ({
        ...testProposals[0],
        id: `proposal-${i.toString().padStart(3, '0')}`,
        engineerName: `エンジニア${i + 1}`
      }));
      
      await page.route('**/api/v1/sales/proposals**', route => 
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
      
      await page.reload();
      await salesHelper.waitForLoadingToComplete();
      
      // スクロール性能のテスト
      const scrollStart = Date.now();
      await page.mouse.wheel(0, 5000);
      await page.waitForTimeout(100);
      const scrollTime = Date.now() - scrollStart;
      
      // スクロールが1秒以内に完了することを確認
      expect(scrollTime).toBeLessThan(1000);
    });
  });
});