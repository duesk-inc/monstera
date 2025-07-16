import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { SalesHelper } from '../helpers/sales-helper';
import { 
  testInterviews, 
  testProposals,
  testUsers, 
  testSuccessMessages, 
  testErrorMessages,
  testExpectations
} from '../test-data/sales-test-data';

/**
 * 面談管理ページのE2Eテスト
 * 
 * テストシナリオ:
 * 1. 営業担当者ログイン・アクセス権限確認
 * 2. 面談カレンダー表示・ナビゲーション
 * 3. 面談作成・編集・削除
 * 4. 面談ステータス管理
 * 5. 日程調整・重複チェック
 * 6. リマインダー機能
 * 7. 表示モード切り替え（カレンダー・リスト）
 * 8. 面談検索・フィルタリング
 * 9. 面談詳細表示・編集
 * 10. エラーハンドリング・バリデーション
 * 11. レスポンシブ対応
 * 12. パフォーマンス確認
 */

test.describe('面談管理システム', () => {
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
    test('営業担当者でログインして面談管理ページにアクセスできる', async ({ page }) => {
      // 営業担当者でログイン
      await salesHelper.loginAsSalesRepresentative();
      
      // 面談管理ページに移動
      await salesHelper.navigateToInterviewManagement();
      
      // ページタイトルの確認
      await expect(page.locator('[data-testid="page-title"]')).toContainText('面談管理');
      
      // 面談カレンダーが表示されることを確認
      await expect(page.locator('[data-testid="interview-calendar"]')).toBeVisible();
      
      // アクションボタンが表示されることを確認
      await expect(page.locator('[data-testid="create-interview-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="refresh-button"]')).toBeVisible();
    });

    test('権限のないユーザーは面談管理ページにアクセスできない', async ({ page }) => {
      // エンジニアでログイン
      await authHelper.loginAsEngineer();
      
      // 面談管理ページに直接アクセス
      await page.goto('/sales/interviews');
      
      // アクセス拒否メッセージまたはリダイレクトの確認
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });
  });

  test.describe('面談カレンダー表示機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('カレンダーが正しく表示される', async ({ page }) => {
      // カレンダーコンポーネントの確認
      await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="calendar-header"]')).toBeVisible();
      
      // 月表示ナビゲーションの確認
      await expect(page.locator('[data-testid="prev-month-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-month-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-month-label"]')).toBeVisible();
      
      // 今日の日付がハイライトされることを確認
      const today = new Date();
      const todayElement = page.locator(`[data-testid="calendar-day-${today.getDate()}"]`);
      await expect(todayElement).toHaveClass(/today/);
    });

    test('面談がカレンダーに正しく表示される', async ({ page }) => {
      // 面談イベントの表示確認
      const interviewEvents = page.locator('[data-testid^="interview-event-"]');
      const eventCount = await interviewEvents.count();
      
      if (eventCount > 0) {
        const firstEvent = interviewEvents.first();
        await expect(firstEvent).toBeVisible();
        
        // 面談の基本情報が表示されることを確認
        await expect(firstEvent).toContainText(/\d{2}:\d{2}/); // 時間表示
      }
    });

    test('カレンダーナビゲーションが機能する', async ({ page }) => {
      // 現在の月を取得
      const currentMonthText = await page.locator('[data-testid="current-month-label"]').textContent();
      
      // 次の月に移動
      await page.click('[data-testid="next-month-button"]');
      await page.waitForTimeout(500);
      
      // 月が変更されることを確認
      const nextMonthText = await page.locator('[data-testid="current-month-label"]').textContent();
      expect(nextMonthText).not.toBe(currentMonthText);
      
      // 前の月に戻る
      await page.click('[data-testid="prev-month-button"]');
      await page.waitForTimeout(500);
      
      // 元の月に戻ることを確認
      const backMonthText = await page.locator('[data-testid="current-month-label"]').textContent();
      expect(backMonthText).toBe(currentMonthText);
    });

    test('日付クリックで面談作成ダイアログが開く', async ({ page }) => {
      // 空いている日付をクリック
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await page.click(`[data-testid="calendar-day-${tomorrow.getDate()}"]`);
      
      // 面談作成ダイアログが開くことを確認
      await expect(page.locator('[data-testid="interview-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="dialog-title"]')).toContainText('面談作成');
      
      // 選択した日付が設定されることを確認
      const dateInput = page.locator('[data-testid="interview-date-input"]');
      const inputValue = await dateInput.inputValue();
      expect(inputValue).toContain(tomorrow.getFullYear().toString());
    });

    test('面談イベントクリックで詳細ダイアログが開く', async ({ page }) => {
      // 面談イベントをクリック
      const interviewEvent = page.locator('[data-testid^="interview-event-"]').first();
      
      if (await interviewEvent.isVisible()) {
        await interviewEvent.click();
        
        // 面談詳細ダイアログが開くことを確認
        await expect(page.locator('[data-testid="interview-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="dialog-title"]')).toContainText('面談詳細');
        
        // 面談情報が表示されることを確認
        await expect(page.locator('[data-testid="interview-engineer-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="interview-client-name"]')).toBeVisible();
      }
    });
  });

  test.describe('表示モード切り替え機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('カレンダー表示とリスト表示を切り替えできる', async ({ page }) => {
      // 初期状態でカレンダー表示
      await expect(page.locator('[data-testid="calendar-tab"]')).toHaveClass(/selected/);
      await expect(page.locator('[data-testid="interview-calendar"]')).toBeVisible();
      
      // リスト表示に切り替え
      await page.click('[data-testid="list-tab"]');
      
      // リスト表示の確認
      await expect(page.locator('[data-testid="list-tab"]')).toHaveClass(/selected/);
      // リスト表示は準備中のメッセージ確認
      await expect(page.locator('text=リスト表示は準備中です')).toBeVisible();
      
      // カレンダー表示に戻す
      await page.click('[data-testid="calendar-tab"]');
      await expect(page.locator('[data-testid="interview-calendar"]')).toBeVisible();
    });
  });

  test.describe('面談作成機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('新規面談を作成できる', async ({ page }) => {
      // 面談追加ボタンをクリック
      await page.click('[data-testid="create-interview-button"]');
      
      // 面談作成ダイアログが開くことを確認
      await expect(page.locator('[data-testid="interview-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="dialog-title"]')).toContainText('面談作成');
      
      // 面談情報を入力
      await page.fill('[data-testid="engineer-name-input"]', '田中太郎');
      await page.fill('[data-testid="client-name-input"]', '株式会社ABC');
      
      // 日時設定
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      await page.fill('[data-testid="interview-date-input"]', dateStr);
      await page.fill('[data-testid="interview-time-input"]', '14:00');
      await page.fill('[data-testid="duration-input"]', '60');
      
      // 面談形式選択
      await page.selectOption('[data-testid="meeting-type-select"]', 'online');
      
      // 保存
      await page.click('[data-testid="save-interview-button"]');
      
      // 成功メッセージの確認
      await expect(page.locator('[data-testid="success-toast"]'))
        .toContainText(testSuccessMessages.interviewScheduled);
      
      // ダイアログが閉じることを確認
      await expect(page.locator('[data-testid="interview-dialog"]')).not.toBeVisible();
    });

    test('必須項目の入力バリデーションが機能する', async ({ page }) => {
      // 面談追加ボタンをクリック
      await page.click('[data-testid="create-interview-button"]');
      
      // 必須項目を空のまま保存
      await page.click('[data-testid="save-interview-button"]');
      
      // バリデーションエラーの確認
      await expect(page.locator('[data-testid="validation-error-engineer"]')).toContainText('エンジニア名は必須です');
      await expect(page.locator('[data-testid="validation-error-client"]')).toContainText('クライアント名は必須です');
      await expect(page.locator('[data-testid="validation-error-date"]')).toContainText('面談日時は必須です');
    });

    test('日程重複チェックが機能する', async ({ page }) => {
      // 面談追加ボタンをクリック
      await page.click('[data-testid="create-interview-button"]');
      
      // 既存の面談と同じ日時を設定
      await page.fill('[data-testid="engineer-name-input"]', '佐藤花子');
      await page.fill('[data-testid="client-name-input"]', '株式会社XYZ');
      await page.fill('[data-testid="interview-date-input"]', '2024-01-25');
      await page.fill('[data-testid="interview-time-input"]', '10:00');
      await page.fill('[data-testid="duration-input"]', '60');
      
      // 重複チェック実行
      await page.click('[data-testid="check-conflicts-button"]');
      
      // 重複警告の表示確認
      await expect(page.locator('[data-testid="conflict-warning"]'))
        .toContainText('指定された時間に他の面談が予定されています');
      
      // 重複している面談リストの表示確認
      await expect(page.locator('[data-testid="conflicting-interviews"]')).toBeVisible();
    });

    test('面談形式に応じた入力フィールドが表示される', async ({ page }) => {
      await page.click('[data-testid="create-interview-button"]');
      
      // オンライン面談を選択
      await page.selectOption('[data-testid="meeting-type-select"]', 'online');
      await expect(page.locator('[data-testid="meeting-url-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="location-input"]')).not.toBeVisible();
      
      // 対面面談を選択
      await page.selectOption('[data-testid="meeting-type-select"]', 'onsite');
      await expect(page.locator('[data-testid="location-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="meeting-url-input"]')).not.toBeVisible();
      
      // ハイブリッド面談を選択
      await page.selectOption('[data-testid="meeting-type-select"]', 'hybrid');
      await expect(page.locator('[data-testid="meeting-url-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="location-input"]')).toBeVisible();
    });
  });

  test.describe('面談編集機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('面談情報を編集できる', async ({ page }) => {
      // 面談イベントをクリック
      const interviewEvent = page.locator('[data-testid^="interview-event-"]').first();
      
      if (await interviewEvent.isVisible()) {
        await interviewEvent.click();
        
        // 編集ボタンをクリック
        await page.click('[data-testid="edit-interview-button"]');
        
        // 編集モードに切り替わることを確認
        await expect(page.locator('[data-testid="dialog-title"]')).toContainText('面談編集');
        
        // 情報を更新
        await page.fill('[data-testid="interview-notes-textarea"]', '技術面談を実施予定');
        await page.selectOption('[data-testid="meeting-type-select"]', 'hybrid');
        
        // 保存
        await page.click('[data-testid="save-interview-button"]');
        
        // 成功メッセージの確認
        await expect(page.locator('[data-testid="success-toast"]'))
          .toContainText('面談を更新しました');
      }
    });

    test('完了した面談は編集できない', async ({ page }) => {
      // 完了済み面談のイベントをクリック
      const completedEvent = page.locator('[data-testid="interview-event-completed"]').first();
      
      if (await completedEvent.isVisible()) {
        await completedEvent.click();
        
        // 編集ボタンが無効または非表示であることを確認
        const editButton = page.locator('[data-testid="edit-interview-button"]');
        if (await editButton.isVisible()) {
          await expect(editButton).toBeDisabled();
        } else {
          await expect(editButton).not.toBeVisible();
        }
      }
    });
  });

  test.describe('面談削除機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('面談を削除できる', async ({ page }) => {
      // 面談イベントをクリック
      const interviewEvent = page.locator('[data-testid^="interview-event-"]').first();
      
      if (await interviewEvent.isVisible()) {
        await interviewEvent.click();
        
        // 編集モードに切り替え
        await page.click('[data-testid="edit-interview-button"]');
        
        // 削除ボタンをクリック
        await page.click('[data-testid="delete-interview-button"]');
        
        // 削除確認ダイアログ
        await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="confirmation-message"]'))
          .toContainText('この面談を削除してもよろしいですか？');
        
        // 削除実行
        await page.click('[data-testid="confirm-delete-button"]');
        
        // 成功メッセージの確認
        await expect(page.locator('[data-testid="success-toast"]'))
          .toContainText('面談を削除しました');
        
        // ダイアログが閉じることを確認
        await expect(page.locator('[data-testid="interview-dialog"]')).not.toBeVisible();
      }
    });

    test('削除確認ダイアログでキャンセルできる', async ({ page }) => {
      const interviewEvent = page.locator('[data-testid^="interview-event-"]').first();
      
      if (await interviewEvent.isVisible()) {
        await interviewEvent.click();
        await page.click('[data-testid="edit-interview-button"]');
        await page.click('[data-testid="delete-interview-button"]');
        
        // キャンセルボタンをクリック
        await page.click('[data-testid="cancel-delete-button"]');
        
        // 削除確認ダイアログが閉じることを確認
        await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible();
        
        // 面談ダイアログは開いたまま
        await expect(page.locator('[data-testid="interview-dialog"]')).toBeVisible();
      }
    });
  });

  test.describe('ステータス管理機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('面談ステータスを変更できる', async ({ page }) => {
      const interviewEvent = page.locator('[data-testid^="interview-event-"]').first();
      
      if (await interviewEvent.isVisible()) {
        await interviewEvent.click();
        await page.click('[data-testid="edit-interview-button"]');
        
        // ステータス変更
        await page.selectOption('[data-testid="status-select"]', 'completed');
        
        // 面談結果入力
        await page.fill('[data-testid="interview-result-textarea"]', '技術面談完了。スキル確認済み。');
        await page.fill('[data-testid="next-steps-textarea"]', '最終面談のスケジュール調整');
        
        // 保存
        await page.click('[data-testid="save-interview-button"]');
        
        // 成功メッセージの確認
        await expect(page.locator('[data-testid="success-toast"]'))
          .toContainText('面談を更新しました');
      }
    });

    test('完了ステータスでは結果入力が必須になる', async ({ page }) => {
      const interviewEvent = page.locator('[data-testid^="interview-event-"]').first();
      
      if (await interviewEvent.isVisible()) {
        await interviewEvent.click();
        await page.click('[data-testid="edit-interview-button"]');
        
        // ステータスを完了に変更
        await page.selectOption('[data-testid="status-select"]', 'completed');
        
        // 結果を入力せずに保存
        await page.click('[data-testid="save-interview-button"]');
        
        // バリデーションエラーの確認
        await expect(page.locator('[data-testid="validation-error-result"]'))
          .toContainText('面談結果は必須です');
      }
    });
  });

  test.describe('面談統計・アラート表示', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('今週の面談予定が正しく表示される', async ({ page }) => {
      // 統計情報アラートの確認
      const statsAlert = page.locator('[data-testid="interview-stats-alert"]');
      await expect(statsAlert).toBeVisible();
      
      // 今週の面談件数が表示されることを確認
      await expect(statsAlert).toContainText(/今週の面談予定: \d+件/);
      
      // 調整中の面談がある場合の表示確認
      const alertText = await statsAlert.textContent();
      if (alertText?.includes('調整中')) {
        expect(alertText).toMatch(/調整中: \d+件/);
      }
    });

    test('面談がない場合は適切なメッセージが表示される', async ({ page }) => {
      // 空のレスポンスを返すモック
      await page.route('**/api/v1/sales/interviews**', route => 
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 })
        })
      );
      
      await page.reload();
      await salesHelper.waitForLoadingToComplete();
      
      // 今週の面談予定が0件であることを確認
      await expect(page.locator('[data-testid="interview-stats-alert"]'))
        .toContainText('今週の面談予定: 0件');
      
      // 成功アラート（面談予定がない場合）
      const alert = page.locator('[data-testid="interview-stats-alert"]');
      await expect(alert).toHaveClass(/MuiAlert-standardSuccess/);
    });
  });

  test.describe('更新・リフレッシュ機能', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
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
      await expect(page.locator('[data-testid="interview-calendar"]')).toBeVisible();
    });
  });

  test.describe('レスポンシブ対応', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('モバイルレイアウトが正しく表示される', async ({ page }) => {
      // モバイルサイズに変更
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // モバイル専用要素の確認
      await expect(page.locator('[data-testid="mobile-calendar-view"]')).toBeVisible();
      
      // アクションボタンが適切に配置されることを確認
      const createButton = page.locator('[data-testid="create-interview-button"]');
      await expect(createButton).toBeVisible();
      
      // タブが適切に表示されることを確認
      await expect(page.locator('[data-testid="calendar-tab"]')).toBeVisible();
      await expect(page.locator('[data-testid="list-tab"]')).toBeVisible();
    });

    test('タブレットレイアウトが正しく表示される', async ({ page }) => {
      // タブレットサイズに変更
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      // タブレット用レイアウトの確認
      await expect(page.locator('[data-testid="interview-calendar"]')).toBeVisible();
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
    });
  });

  test.describe('エラーハンドリング', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
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

    test('API エラー時の適切な表示', async ({ page }) => {
      // APIエラーレスポンスを返すモック
      await page.route('**/api/v1/sales/interviews**', route => 
        route.fulfill({ status: 500, body: '{"error": "サーバーエラーが発生しました"}' })
      );
      
      await page.click('[data-testid="refresh-button"]');
      
      // エラーメッセージの確認
      await expect(page.locator('[data-testid="error-toast"]'))
        .toContainText('面談一覧取得に失敗しました');
    });

    test('面談作成時のエラーハンドリング', async ({ page }) => {
      // 面談作成でエラーレスポンスを返すモック
      await page.route('**/api/v1/sales/interviews', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({ status: 400, body: '{"error": "不正なデータです"}' });
        } else {
          route.continue();
        }
      });
      
      await page.click('[data-testid="create-interview-button"]');
      
      // 正常な入力を行う
      await page.fill('[data-testid="engineer-name-input"]', '田中太郎');
      await page.fill('[data-testid="client-name-input"]', '株式会社ABC');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      await page.fill('[data-testid="interview-date-input"]', dateStr);
      await page.fill('[data-testid="interview-time-input"]', '14:00');
      
      // 保存してエラーを発生させる
      await page.click('[data-testid="save-interview-button"]');
      
      // エラーメッセージの確認
      await expect(page.locator('[data-testid="error-toast"]'))
        .toContainText('面談作成に失敗しました');
    });
  });

  test.describe('パフォーマンス', () => {
    test('ページ読み込み時間が許容範囲内', async ({ page }) => {
      const startTime = Date.now();
      
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
      
      const loadTime = Date.now() - startTime;
      
      // 15秒以内に読み込み完了することを確認
      expect(loadTime).toBeLessThan(testExpectations.pageLoadTimeout);
    });

    test('カレンダーナビゲーションの応答性', async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
      
      // 月移動の応答性テスト
      const navigationStart = Date.now();
      await page.click('[data-testid="next-month-button"]');
      await page.waitForSelector('[data-testid="calendar-grid"]');
      const navigationTime = Date.now() - navigationStart;
      
      // 1秒以内に月移動が完了することを確認
      expect(navigationTime).toBeLessThan(1000);
    });

    test('大量の面談データでのパフォーマンス', async ({ page }) => {
      // 大量データのモック（50件の面談）
      const largeDataSet = Array.from({ length: 50 }, (_, i) => ({
        ...testInterviews[0],
        id: `interview-${i.toString().padStart(3, '0')}`,
        engineerName: `エンジニア${i + 1}`,
        scheduledDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString()
      }));
      
      await page.route('**/api/v1/sales/interviews**', route => 
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
      await salesHelper.navigateToInterviewManagement();
      
      const renderStart = Date.now();
      await salesHelper.waitForLoadingToComplete();
      const renderTime = Date.now() - renderStart;
      
      // 3秒以内に大量データが表示されることを確認
      expect(renderTime).toBeLessThan(3000);
      
      // 面談イベントが表示されることを確認
      const interviewEvents = page.locator('[data-testid^="interview-event-"]');
      const eventCount = await interviewEvents.count();
      expect(eventCount).toBeGreaterThan(0);
    });
  });

  test.describe('キーボードナビゲーション', () => {
    test.beforeEach(async ({ page }) => {
      await salesHelper.loginAsSalesRepresentative();
      await salesHelper.navigateToInterviewManagement();
      await salesHelper.waitForLoadingToComplete();
    });

    test('キーボードでカレンダーを操作できる', async ({ page }) => {
      // カレンダーにフォーカス
      await page.focus('[data-testid="calendar-grid"]');
      
      // 矢印キーで日付移動
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      
      // Enterキーで日付選択
      await page.keyboard.press('Enter');
      
      // 面談作成ダイアログが開くことを確認
      await expect(page.locator('[data-testid="interview-dialog"]')).toBeVisible();
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
  });
});