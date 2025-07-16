import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

/**
 * 週報機能のE2Eテスト
 * 
 * テストシナリオ:
 * 1. 週報の作成・編集・提出
 * 2. 週報一覧の表示・フィルタリング
 * 3. 週報の承認・却下プロセス
 * 4. 週報テンプレート機能
 * 5. 週報の検索・エクスポート機能
 */

test.describe('週報機能', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test.describe('エンジニア: 週報作成・編集機能', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsEngineer();
    });

    test('新規週報を作成できる', async ({ page }) => {
      // 週報一覧ページに移動
      await page.goto('/dashboard/weekly-reports');
      await page.waitForLoadState('networkidle');

      // 新規作成ボタンをクリック
      await page.click('[data-testid="create-new-report-button"]');

      // 週報作成画面に遷移することを確認
      await expect(page).toHaveURL(/.*weekly-reports\/new/);

      // 必要な入力フィールドが表示されることを確認
      await expect(page.locator('[data-testid="week-selector"]')).toBeVisible();
      await expect(page.locator('[data-testid="mood-selector"]')).toBeVisible();
      await expect(page.locator('[data-testid="daily-record-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="weekly-summary-section"]')).toBeVisible();

      // 週選択
      await page.selectOption('[data-testid="week-selector"]', '2024-01-15'); // 今週

      // ムード選択（5: サイコー）
      await page.click('[data-testid="mood-5"]');

      // 日次記録を入力
      for (let day = 1; day <= 5; day++) {
        // 稼働時間入力
        await page.fill(`[data-testid="company-hours-day-${day}"]`, '8');
        await page.fill(`[data-testid="client-hours-day-${day}"]`, '7.5');
        
        // 作業内容入力
        await page.fill(`[data-testid="work-content-day-${day}"]`, `${day}日目の作業内容を記録しました。`);
        
        // 備考入力
        await page.fill(`[data-testid="remarks-day-${day}"]`, `${day}日目の備考です。`);
      }

      // 週次所感を入力
      await page.fill('[data-testid="weekly-remarks"]', '今週は新機能の開発がスムーズに進み、予定より早く完了しました。来週はテストとレビューに集中する予定です。');

      // 下書き保存
      await page.click('[data-testid="save-draft-button"]');

      // 保存成功のメッセージが表示されることを確認
      await expect(page.locator('[data-testid="success-message"]')).toContainText('下書きを保存しました');

      // 週報一覧に戻る
      await page.goto('/dashboard/weekly-reports');

      // 作成した週報が下書き状態で表示されることを確認
      await expect(page.locator('[data-testid="report-status-draft"]')).toBeVisible();
    });

    test('週報を提出できる', async ({ page }) => {
      // 既存の下書き週報の編集画面に移動（セットアップで作成済みと仮定）
      await page.goto('/dashboard/weekly-reports/draft/123');
      await page.waitForLoadState('networkidle');

      // 入力内容の確認・修正
      await page.fill('[data-testid="weekly-remarks"]', '週次所感を更新しました。全ての作業が完了し、品質も満足のいくレベルです。');

      // 提出ボタンをクリック
      await page.click('[data-testid="submit-button"]');

      // 確認ダイアログが表示される
      await expect(page.locator('[data-testid="submit-confirmation-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('週報を提出しますか？');

      // 確認ボタンをクリック
      await page.click('[data-testid="confirm-submit-button"]');

      // 提出成功のメッセージが表示される
      await expect(page.locator('[data-testid="success-message"]')).toContainText('週報を提出しました');

      // 週報一覧ページに自動遷移
      await expect(page).toHaveURL(/.*weekly-reports$/);

      // ステータスが「提出済」になることを確認
      await expect(page.locator('[data-testid="report-status-submitted"]')).toBeVisible();
    });

    test('週報のバリデーションが正しく動作する', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports/new');
      await page.waitForLoadState('networkidle');

      // 必須項目を未入力で提出を試行
      await page.click('[data-testid="submit-button"]');

      // バリデーションエラーが表示されることを確認
      await expect(page.locator('[data-testid="validation-error-week"]')).toContainText('対象週を選択してください');
      await expect(page.locator('[data-testid="validation-error-mood"]')).toContainText('今週の気分を選択してください');
      await expect(page.locator('[data-testid="validation-error-weekly-remarks"]')).toContainText('週次所感を入力してください');

      // 不正な時間を入力
      await page.fill('[data-testid="company-hours-day-1"]', '25'); // 24時間を超える
      await page.fill('[data-testid="client-hours-day-1"]', '-1'); // 負の値

      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="validation-error-hours"]')).toContainText('稼働時間は0-24時間の範囲で入力してください');
    });

    test('週報テンプレート機能が動作する', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports/new');
      await page.waitForLoadState('networkidle');

      // テンプレート選択ボタンが表示されることを確認
      await expect(page.locator('[data-testid="template-selector"]')).toBeVisible();

      // テンプレートを選択
      await page.selectOption('[data-testid="template-selector"]', 'development-template');

      // テンプレートが適用されることを確認
      const workContent = await page.inputValue('[data-testid="work-content-day-1"]');
      expect(workContent).toContain('開発作業');

      // カスタムテンプレートの保存
      await page.fill('[data-testid="work-content-day-1"]', 'カスタムテンプレート内容');
      await page.click('[data-testid="save-template-button"]');

      // テンプレート名入力ダイアログが表示される
      await expect(page.locator('[data-testid="template-name-dialog"]')).toBeVisible();
      await page.fill('[data-testid="template-name-input"]', 'マイテンプレート');
      await page.click('[data-testid="save-template-confirm"]');

      // 保存成功メッセージが表示される
      await expect(page.locator('[data-testid="success-message"]')).toContainText('テンプレートを保存しました');
    });

    test('週報の履歴表示と編集制限が正しく動作する', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports');
      await page.waitForLoadState('networkidle');

      // 過去の週報を選択
      await page.click('[data-testid="report-item-approved"]');

      // 詳細表示画面に遷移
      await expect(page).toHaveURL(/.*weekly-reports\/\d+/);

      // 承認済みの週報は編集できないことを確認
      await expect(page.locator('[data-testid="edit-button"]')).toBeDisabled();
      await expect(page.locator('[data-testid="readonly-notice"]')).toContainText('承認済みの週報は編集できません');

      // 内容は表示されることを確認
      await expect(page.locator('[data-testid="weekly-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="approval-info"]')).toBeVisible();
    });
  });

  test.describe('マネージャー: 週報承認機能', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsManager();
    });

    test('週報一覧を確認できる', async ({ page }) => {
      await page.goto('/manager/weekly-reports');
      await page.waitForLoadState('networkidle');

      // ページタイトルの確認
      await expect(page.locator('[data-testid="page-title"]')).toContainText('週報管理');

      // フィルター機能の確認
      await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="period-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="engineer-filter"]')).toBeVisible();

      // 週報リストが表示されることを確認
      await expect(page.locator('[data-testid="weekly-reports-list"]')).toBeVisible();

      // 各週報にアクション可能なボタンが表示されることを確認
      const reportItems = page.locator('[data-testid^="report-item-"]');
      if (await reportItems.count() > 0) {
        await expect(reportItems.first().locator('[data-testid="view-button"]')).toBeVisible();
        await expect(reportItems.first().locator('[data-testid="approve-button"]')).toBeVisible();
      }
    });

    test('週報を承認できる', async ({ page }) => {
      await page.goto('/manager/weekly-reports');
      await page.waitForLoadState('networkidle');

      // 提出済みの週報を選択
      await page.click('[data-testid="report-item-submitted"] [data-testid="view-button"]');

      // 週報詳細画面に遷移
      await expect(page.locator('[data-testid="report-detail"]')).toBeVisible();

      // 内容を確認
      await expect(page.locator('[data-testid="engineer-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="weekly-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="daily-records"]')).toBeVisible();

      // 承認ボタンをクリック
      await page.click('[data-testid="approve-button"]');

      // 承認コメント入力ダイアログが表示される
      await expect(page.locator('[data-testid="approval-comment-dialog"]')).toBeVisible();
      await page.fill('[data-testid="approval-comment"]', '内容を確認しました。今週もお疲れ様でした。');

      // 承認実行
      await page.click('[data-testid="confirm-approve-button"]');

      // 承認成功メッセージが表示される
      await expect(page.locator('[data-testid="success-message"]')).toContainText('週報を承認しました');

      // ステータスが更新されることを確認
      await expect(page.locator('[data-testid="status-badge"]')).toContainText('承認済');
    });

    test('週報を却下できる', async ({ page }) => {
      await page.goto('/manager/weekly-reports');
      await page.waitForLoadState('networkidle');

      // 提出済みの週報を選択
      await page.click('[data-testid="report-item-submitted"] [data-testid="view-button"]');

      // 却下ボタンをクリック
      await page.click('[data-testid="reject-button"]');

      // 却下理由入力ダイアログが表示される
      await expect(page.locator('[data-testid="rejection-reason-dialog"]')).toBeVisible();
      await page.fill('[data-testid="rejection-reason"]', '作業内容の詳細が不足しています。もう少し具体的に記載してください。');

      // 却下実行
      await page.click('[data-testid="confirm-reject-button"]');

      // 却下成功メッセージが表示される
      await expect(page.locator('[data-testid="success-message"]')).toContainText('週報を却下しました');

      // ステータスが更新されることを確認
      await expect(page.locator('[data-testid="status-badge"]')).toContainText('却下');
    });

    test('週報の一括操作ができる', async ({ page }) => {
      await page.goto('/manager/weekly-reports');
      await page.waitForLoadState('networkidle');

      // 複数の週報を選択
      await page.check('[data-testid="select-report-1"]');
      await page.check('[data-testid="select-report-2"]');

      // 一括操作メニューが表示されることを確認
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();

      // 一括承認ボタンをクリック
      await page.click('[data-testid="bulk-approve-button"]');

      // 確認ダイアログが表示される
      await expect(page.locator('[data-testid="bulk-approval-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('2件');

      // 一括承認実行
      await page.click('[data-testid="confirm-bulk-approve"]');

      // 処理完了メッセージが表示される
      await expect(page.locator('[data-testid="success-message"]')).toContainText('2件の週報を承認しました');
    });

    test('週報統計を確認できる', async ({ page }) => {
      await page.goto('/manager/weekly-reports/statistics');
      await page.waitForLoadState('networkidle');

      // 統計画面の要素が表示されることを確認
      await expect(page.locator('[data-testid="submission-rate-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="mood-distribution-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-hours-chart"]')).toBeVisible();

      // 期間選択機能
      await page.selectOption('[data-testid="period-select"]', 'last-month');
      await page.waitForTimeout(1000);

      // グラフが更新されることを確認
      await expect(page.locator('[data-testid="chart-loading"]')).not.toBeVisible();

      // エクスポート機能
      await page.click('[data-testid="export-statistics-button"]');
      await expect(page.locator('[data-testid="export-format-dialog"]')).toBeVisible();
      await page.click('[data-testid="export-pdf"]');
    });
  });

  test.describe('管理者: 週報設定・管理機能', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsAdmin();
    });

    test('週報設定を管理できる', async ({ page }) => {
      await page.goto('/admin/settings/weekly-reports');
      await page.waitForLoadState('networkidle');

      // 設定項目が表示されることを確認
      await expect(page.locator('[data-testid="submission-deadline"]')).toBeVisible();
      await expect(page.locator('[data-testid="reminder-settings"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-management"]')).toBeVisible();

      // 提出期限設定
      await page.selectOption('[data-testid="deadline-day"]', 'monday');
      await page.selectOption('[data-testid="deadline-time"]', '17:00');

      // リマインダー設定
      await page.check('[data-testid="enable-reminders"]');
      await page.fill('[data-testid="reminder-days-before"]', '2');

      // 設定保存
      await page.click('[data-testid="save-settings-button"]');

      // 保存成功メッセージが表示される
      await expect(page.locator('[data-testid="success-message"]')).toContainText('設定を保存しました');
    });

    test('全社週報データを確認できる', async ({ page }) => {
      await page.goto('/admin/weekly-reports/overview');
      await page.waitForLoadState('networkidle');

      // ダッシュボード要素の確認
      await expect(page.locator('[data-testid="total-reports-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="submission-rate-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-approval-card"]')).toBeVisible();

      // 部署別統計
      await expect(page.locator('[data-testid="department-statistics"]')).toBeVisible();

      // 未提出者リスト
      await expect(page.locator('[data-testid="unsubmitted-list"]')).toBeVisible();

      // フィルター機能
      await page.selectOption('[data-testid="department-filter"]', 'engineering');
      await page.selectOption('[data-testid="week-filter"]', 'current');
      await page.click('[data-testid="apply-filter-button"]');

      // データが更新されることを確認
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
    });

    test('週報テンプレートを管理できる', async ({ page }) => {
      await page.goto('/admin/settings/weekly-report-templates');
      await page.waitForLoadState('networkidle');

      // 既存テンプレート一覧が表示される
      await expect(page.locator('[data-testid="template-list"]')).toBeVisible();

      // 新規テンプレート作成
      await page.click('[data-testid="create-template-button"]');

      // テンプレート作成ダイアログが表示される
      await expect(page.locator('[data-testid="template-creation-dialog"]')).toBeVisible();

      // テンプレート情報を入力
      await page.fill('[data-testid="template-name"]', '開発チーム用テンプレート');
      await page.fill('[data-testid="template-description"]', '開発チーム向けの標準的な週報テンプレートです');

      // 日次記録のデフォルト値設定
      for (let day = 1; day <= 5; day++) {
        await page.fill(`[data-testid="default-work-content-${day}"]`, `【${day}日目】\n・開発作業: \n・レビュー: \n・ミーティング: `);
      }

      // 週次所感のテンプレート設定
      await page.fill('[data-testid="default-weekly-remarks"]', '【今週の成果】\n\n【来週の予定】\n\n【課題・改善点】\n');

      // テンプレート保存
      await page.click('[data-testid="save-template-button"]');

      // 保存成功メッセージが表示される
      await expect(page.locator('[data-testid="success-message"]')).toContainText('テンプレートを作成しました');

      // テンプレート一覧に追加されることを確認
      await expect(page.locator('[data-testid="template-item-development"]')).toBeVisible();
    });
  });

  test.describe('週報検索・エクスポート機能', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsManager();
    });

    test('週報を検索できる', async ({ page }) => {
      await page.goto('/manager/weekly-reports');
      await page.waitForLoadState('networkidle');

      // 検索機能の確認
      await page.fill('[data-testid="search-input"]', '新機能開発');
      await page.click('[data-testid="search-button"]');

      // 検索結果が表示される
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

      // 高度な検索フィルター
      await page.click('[data-testid="advanced-search-toggle"]');
      await expect(page.locator('[data-testid="advanced-search-panel"]')).toBeVisible();

      // 期間指定
      await page.fill('[data-testid="search-date-from"]', '2024-01-01');
      await page.fill('[data-testid="search-date-to"]', '2024-01-31');

      // エンジニア指定
      await page.selectOption('[data-testid="search-engineer"]', 'john-doe');

      // ステータス指定
      await page.check('[data-testid="search-status-approved"]');

      // 検索実行
      await page.click('[data-testid="advanced-search-button"]');

      // フィルタリングされた結果が表示される
      await expect(page.locator('[data-testid="filtered-results-count"]')).toBeVisible();
    });

    test('週報をエクスポートできる', async ({ page }) => {
      await page.goto('/manager/weekly-reports');
      await page.waitForLoadState('networkidle');

      // エクスポートボタンをクリック
      await page.click('[data-testid="export-button"]');

      // エクスポート設定ダイアログが表示される
      await expect(page.locator('[data-testid="export-settings-dialog"]')).toBeVisible();

      // エクスポート形式選択
      await page.check('[data-testid="export-format-excel"]');

      // 期間指定
      await page.selectOption('[data-testid="export-period"]', 'last-month');

      // 含める項目の選択
      await page.check('[data-testid="include-daily-records"]');
      await page.check('[data-testid="include-approval-comments"]');

      // エクスポート実行
      await page.click('[data-testid="execute-export-button"]');

      // エクスポート進行状況が表示される
      await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();

      // 完了メッセージが表示される
      await expect(page.locator('[data-testid="export-complete-message"]')).toBeVisible();
    });
  });

  test.describe('レスポンシブ・アクセシビリティテスト', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsEngineer();
    });

    test('モバイル環境での週報作成が正しく動作する', async ({ page }) => {
      // モバイルサイズに設定
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard/weekly-reports/new');
      await page.waitForLoadState('networkidle');

      // モバイルレイアウトが適用されることを確認
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();

      // タッチ操作のテスト
      await page.tap('[data-testid="mood-4"]');
      await expect(page.locator('[data-testid="mood-4"]')).toHaveClass(/selected/);

      // 仮想キーボード考慮のスクロール
      await page.fill('[data-testid="weekly-remarks"]', 'モバイルでの入力テストです。');
      
      // 入力フィールドが画面内に表示されることを確認
      await expect(page.locator('[data-testid="weekly-remarks"]')).toBeInViewport();
    });

    test('キーボードナビゲーションが正しく動作する', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports/new');
      await page.waitForLoadState('networkidle');

      // Tabキーでのフォーカス移動
      await page.keyboard.press('Tab'); // 週選択
      await expect(page.locator('[data-testid="week-selector"]')).toBeFocused();

      await page.keyboard.press('Tab'); // ムード選択
      await expect(page.locator('[data-testid="mood-1"]')).toBeFocused();

      // Enterキーでムード選択
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="mood-1"]')).toHaveClass(/selected/);

      // Shift+Tabで逆方向移動
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('[data-testid="week-selector"]')).toBeFocused();
    });

    test('スクリーンリーダー対応が適切に設定されている', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports/new');
      await page.waitForLoadState('networkidle');

      // ARIA属性の確認
      await expect(page.locator('[data-testid="mood-selector"]')).toHaveAttribute('role', 'radiogroup');
      await expect(page.locator('[data-testid="mood-selector"]')).toHaveAttribute('aria-label', '今週の気分を選択してください');

      // ラベルとフィールドの関連付け確認
      await expect(page.locator('[data-testid="weekly-remarks"]')).toHaveAttribute('aria-describedby');

      // エラーメッセージのaria-live設定確認
      await expect(page.locator('[data-testid="error-container"]')).toHaveAttribute('aria-live', 'polite');
    });
  });

  test.describe('パフォーマンス・エラーハンドリングテスト', () => {
    test('大量データでのパフォーマンス', async ({ page }) => {
      await authHelper.loginAsManager();

      // 大量データのページを読み込み
      await page.goto('/manager/weekly-reports?limit=1000');
      
      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // 5秒以内に読み込まれることを確認
      expect(loadTime).toBeLessThan(5000);

      // 仮想スクロールが動作することを確認
      await expect(page.locator('[data-testid="virtual-scroll-container"]')).toBeVisible();
    });

    test('ネットワークエラーの処理', async ({ page }) => {
      await authHelper.loginAsEngineer();

      // ネットワークエラーをシミュレート
      await page.route('**/api/weekly-reports', route => route.abort());

      await page.goto('/dashboard/weekly-reports');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // リトライ機能のテスト
      await page.unroute('**/api/weekly-reports');
      await page.click('[data-testid="retry-button"]');

      // データが正常に読み込まれることを確認
      await expect(page.locator('[data-testid="weekly-reports-list"]')).toBeVisible();
    });

    test('セッション切れ時の処理', async ({ page }) => {
      await authHelper.loginAsEngineer();
      await page.goto('/dashboard/weekly-reports/new');

      // セッション切れをシミュレート
      await page.route('**/api/weekly-reports', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      });

      // 保存を試行
      await page.click('[data-testid="save-draft-button"]');

      // 認証エラーダイアログが表示される
      await expect(page.locator('[data-testid="auth-error-dialog"]')).toBeVisible();

      // 再ログインボタンをクリック
      await page.click('[data-testid="relogin-button"]');

      // ログインページにリダイレクトされることを確認
      await expect(page).toHaveURL(/.*login/);
    });
  });
});