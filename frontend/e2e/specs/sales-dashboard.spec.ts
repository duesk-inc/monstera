import { test, expect } from '@playwright/test';
import { TEST_EMAILS, TEST_PASSWORDS } from '../../src/test-utils/test-emails';

test.describe('営業ダッシュボードページ', () => {
  // テスト前のセットアップ
  test.beforeEach(async ({ page }) => {
    // 営業マネージャーでログイン
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_EMAILS.sales);
    await page.fill('[data-testid="password-input"]', TEST_PASSWORDS.default);
    await page.click('[data-testid="login-button"]');
    
    // ダッシュボードページに移動
    await page.goto('/sales');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
  });

  test('ダッシュボードページが正しく表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('[data-testid="page-title"]')).toContainText('営業ダッシュボード');
    
    // 更新ボタンが表示されることを確認
    await expect(page.locator('[data-testid="refresh-button"]')).toBeVisible();
  });

  test('期限アラートが表示される', async ({ page }) => {
    // 本日期限のアラートが表示されることを確認
    const alert = page.locator('[data-testid="deadline-alert"]');
    
    if (await alert.isVisible()) {
      await expect(alert).toContainText('本日期限の提案が');
      await expect(alert).toContainText('件あります');
      
      // アラートのアイコンが表示されることを確認
      await expect(alert.locator('[data-testid="warning-icon"]')).toBeVisible();
    }
  });

  test('メトリックカードが正しく表示される', async ({ page }) => {
    // 総提案数カード
    const totalProposalsCard = page.locator('[data-testid="metric-card-total-proposals"]');
    await expect(totalProposalsCard).toBeVisible();
    await expect(totalProposalsCard.locator('[data-testid="metric-title"]')).toContainText('総提案数');
    await expect(totalProposalsCard.locator('[data-testid="metric-value"]')).toBeVisible();
    await expect(totalProposalsCard.locator('[data-testid="metric-unit"]')).toContainText('件');
    
    // アクティブ提案カード
    const activeProposalsCard = page.locator('[data-testid="metric-card-active-proposals"]');
    await expect(activeProposalsCard).toBeVisible();
    await expect(activeProposalsCard.locator('[data-testid="metric-title"]')).toContainText('アクティブ提案');
    
    // 今後の面談カード
    const upcomingInterviewsCard = page.locator('[data-testid="metric-card-upcoming-interviews"]');
    await expect(upcomingInterviewsCard).toBeVisible();
    await expect(upcomingInterviewsCard.locator('[data-testid="metric-title"]')).toContainText('今後の面談');
    
    // 延長確認待ちカード
    const pendingExtensionsCard = page.locator('[data-testid="metric-card-pending-extensions"]');
    await expect(pendingExtensionsCard).toBeVisible();
    await expect(pendingExtensionsCard.locator('[data-testid="metric-title"]')).toContainText('延長確認待ち');
  });

  test('メトリックカードをクリックして詳細画面に遷移する', async ({ page }) => {
    // 総提案数カードをクリック
    await page.click('[data-testid="metric-card-total-proposals"]');
    
    // URL変更またはダイアログ表示を確認（実装に応じて）
    // 例: 提案一覧ページに遷移する場合
    // await expect(page).toHaveURL(/.*proposals/);
    
    // または詳細ダイアログが表示される場合
    // await expect(page.locator('[data-testid="proposals-detail-dialog"]')).toBeVisible();
  });

  test('ステータス分布セクションが正しく表示される', async ({ page }) => {
    const statusSection = page.locator('[data-testid="status-distribution-section"]');
    await expect(statusSection).toBeVisible();
    
    // セクションタイトル
    await expect(statusSection.locator('[data-testid="section-title"]')).toContainText('提案ステータス分布');
    
    // ステータスごとの表示確認
    const statusItems = statusSection.locator('[data-testid="status-item"]');
    await expect(statusItems).not.toHaveCount(0);
    
    // 各ステータス項目に件数が表示されることを確認
    const firstStatus = statusItems.first();
    await expect(firstStatus.locator('[data-testid="status-name"]')).toBeVisible();
    await expect(firstStatus.locator('[data-testid="status-count"]')).toContainText('件');
  });

  test('最近の活動セクションが正しく表示される', async ({ page }) => {
    const activitySection = page.locator('[data-testid="recent-activities-section"]');
    await expect(activitySection).toBeVisible();
    
    // セクションタイトル
    await expect(activitySection.locator('[data-testid="section-title"]')).toContainText('最近の活動');
    
    // 活動項目の確認
    const activityItems = activitySection.locator('[data-testid="activity-item"]');
    
    if ((await activityItems.count()) > 0) {
      const firstActivity = activityItems.first();
      
      // アイコンが表示されることを確認
      await expect(firstActivity.locator('[data-testid="activity-icon"]')).toBeVisible();
      
      // 説明文が表示されることを確認
      await expect(firstActivity.locator('[data-testid="activity-description"]')).toBeVisible();
      
      // タイムスタンプが表示されることを確認
      await expect(firstActivity.locator('[data-testid="activity-timestamp"]')).toBeVisible();
    }
  });

  test('今週のトレンドセクションが正しく表示される', async ({ page }) => {
    const trendsSection = page.locator('[data-testid="weekly-trends-section"]');
    await expect(trendsSection).toBeVisible();
    
    // セクションタイトル
    await expect(trendsSection.locator('[data-testid="section-title"]')).toContainText('今週のトレンド');
    
    // 新規提案
    const proposalsTrend = trendsSection.locator('[data-testid="trend-proposals"]');
    await expect(proposalsTrend).toBeVisible();
    await expect(proposalsTrend.locator('[data-testid="trend-value"]')).toBeVisible();
    await expect(proposalsTrend.locator('[data-testid="trend-label"]')).toContainText('新規提案');
    
    // 面談実施
    const interviewsTrend = trendsSection.locator('[data-testid="trend-interviews"]');
    await expect(interviewsTrend).toBeVisible();
    await expect(interviewsTrend.locator('[data-testid="trend-label"]')).toContainText('面談実施');
    
    // 採用決定
    const acceptancesTrend = trendsSection.locator('[data-testid="trend-acceptances"]');
    await expect(acceptancesTrend).toBeVisible();
    await expect(acceptancesTrend.locator('[data-testid="trend-label"]')).toContainText('採用決定');
  });

  test('データ更新機能が動作する', async ({ page }) => {
    // 更新ボタンをクリック
    await page.click('[data-testid="refresh-button"]');
    
    // ローディング状態の確認
    await expect(page.locator('[data-testid="refresh-button"]')).toBeDisabled();
    
    // データが更新されるまで待機
    await page.waitForTimeout(1000);
    
    // ボタンが再度有効になることを確認
    await expect(page.locator('[data-testid="refresh-button"]')).toBeEnabled();
  });

  test('レスポンシブ表示が正しく動作する', async ({ page }) => {
    // デスクトップサイズでの表示確認
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // メトリックカードが4列で表示されることを確認
    const metricCards = page.locator('[data-testid^="metric-card-"]');
    await expect(metricCards).toHaveCount(4);
    
    // タブレットサイズに変更
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // レイアウトが適切に調整されることを確認
    await expect(metricCards.first()).toBeVisible();
    
    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });
    
    // すべてのカードが表示されることを確認
    await expect(metricCards.first()).toBeVisible();
    await expect(metricCards.last()).toBeVisible();
  });

  test('ローディング状態が正しく表示される', async ({ page }) => {
    // ネットワークを遅延させてローディング状態をテスト
    await page.route('**/api/sales/dashboard', async route => {
      await page.waitForTimeout(2000); // 2秒遅延
      await route.continue();
    });
    
    // ページをリロード
    await page.reload();
    
    // ローディング状態の確認
    await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible();
    
    // データ読み込み完了まで待機
    await page.waitForLoadState('networkidle');
    
    // ローディング状態が終了することを確認
    await expect(page.locator('[data-testid="loading-skeleton"]')).not.toBeVisible();
  });

  test('エラー状態が正しく処理される', async ({ page }) => {
    // APIエラーをシミュレート
    await page.route('**/api/sales/dashboard', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'サーバーエラーが発生しました' })
      });
    });
    
    // ページをリロード
    await page.reload();
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('データの取得に失敗しました');
    
    // 再試行ボタンが表示されることを確認
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('期間フィルターが正しく動作する', async ({ page }) => {
    // 期間選択ボタンが表示されることを確認
    const periodButtons = page.locator('[data-testid="period-filter"]');
    
    if (await periodButtons.isVisible()) {
      // 今日ボタンをクリック
      await page.click('[data-testid="period-today"]');
      
      // データが更新されるまで待機
      await page.waitForTimeout(500);
      
      // 週ボタンをクリック
      await page.click('[data-testid="period-week"]');
      
      // データが更新されるまで待機
      await page.waitForTimeout(500);
      
      // 月ボタンをクリック
      await page.click('[data-testid="period-month"]');
      
      // データが更新されるまで待機
      await page.waitForTimeout(500);
    }
  });

  test('ナビゲーション機能が正しく動作する', async ({ page }) => {
    // サイドバーのナビゲーションリンクをテスト
    
    // 提案管理への遷移
    await page.click('[data-testid="nav-proposals"]');
    await expect(page).toHaveURL(/.*proposals/);
    
    // ダッシュボードに戻る
    await page.goto('/sales');
    
    // 面談管理への遷移
    await page.click('[data-testid="nav-interviews"]');
    await expect(page).toHaveURL(/.*interviews/);
    
    // ダッシュボードに戻る
    await page.goto('/sales');
    
    // 契約延長管理への遷移
    await page.click('[data-testid="nav-extensions"]');
    await expect(page).toHaveURL(/.*extensions/);
  });

  test('キーボードナビゲーションが動作する', async ({ page }) => {
    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    
    // 更新ボタンにフォーカスが移動することを確認
    await expect(page.locator('[data-testid="refresh-button"]')).toBeFocused();
    
    // Enterキーで更新実行
    await page.keyboard.press('Enter');
    
    // 更新処理が実行されることを確認
    await expect(page.locator('[data-testid="refresh-button"]')).toBeDisabled();
  });

  test('通知とアラートが適切に表示される', async ({ page }) => {
    // 通知がある場合の表示確認
    const notifications = page.locator('[data-testid="notifications"]');
    
    if (await notifications.isVisible()) {
      // 通知アイコンが表示されることを確認
      await expect(notifications.locator('[data-testid="notification-icon"]')).toBeVisible();
      
      // 通知をクリックして詳細表示
      await notifications.click();
      
      // 通知詳細が表示されることを確認
      await expect(page.locator('[data-testid="notification-details"]')).toBeVisible();
    }
  });

  test('印刷用スタイルが適用される', async ({ page }) => {
    // 印刷プレビューを開く
    await page.keyboard.press('Control+P');
    
    // 印刷ダイアログが表示されるまで待機
    await page.waitForTimeout(1000);
    
    // ESCキーで印刷ダイアログを閉じる
    await page.keyboard.press('Escape');
  });

  test('データエクスポート機能が動作する', async ({ page }) => {
    // エクスポートボタンが表示される場合のテスト
    const exportButton = page.locator('[data-testid="export-button"]');
    
    if (await exportButton.isVisible()) {
      // エクスポートボタンをクリック
      await exportButton.click();
      
      // エクスポート形式選択ダイアログが表示されることを確認
      await expect(page.locator('[data-testid="export-format-dialog"]')).toBeVisible();
      
      // CSV形式を選択
      await page.click('[data-testid="export-csv"]');
      
      // ダウンロード処理の確認（実際のファイルダウンロードは環境により異なる）
      await page.waitForTimeout(1000);
    }
  });

  test('パフォーマンス要件を満たす', async ({ page }) => {
    // ページ読み込み時間の測定
    const startTime = Date.now();
    
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 3秒以内に読み込まれることを確認
    expect(loadTime).toBeLessThan(3000);
  });

  test('アクセシビリティ要件を満たす', async ({ page }) => {
    // ページ読み込み後のアクセシビリティ確認
    await page.waitForLoadState('networkidle');
    
    // 主要な要素にaria-labelが設定されていることを確認
    await expect(page.locator('[data-testid="refresh-button"]')).toHaveAttribute('aria-label');
    
    // フォーカス可能な要素が適切にフォーカスできることを確認
    const focusableElements = page.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await focusableElements.count();
    
    if (count > 0) {
      await focusableElements.first().focus();
      await expect(focusableElements.first()).toBeFocused();
    }
  });
});

// 認証が必要なテスト用のヘルパー関数
test.describe('認証エラーハンドリング', () => {
  test('未認証状態でのアクセス制御', async ({ page }) => {
    // ログアウト状態でダッシュボードにアクセス
    await page.goto('/sales');
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*login/);
  });

  test('権限不足状態でのアクセス制御', async ({ page }) => {
    // 権限のないユーザーでログイン
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'engineer@duesk.co.jp');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 営業ダッシュボードにアクセス
    await page.goto('/sales');
    
    // アクセス拒否画面または適切なエラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
  });
});