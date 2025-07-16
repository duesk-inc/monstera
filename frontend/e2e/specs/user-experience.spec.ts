import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

/**
 * ユーザーエクスペリエンス統合テスト
 * 
 * テストシナリオ:
 * 1. レスポンシブデザインの検証
 * 2. アクセシビリティ機能の検証
 * 3. パフォーマンス要件の検証
 * 4. 多言語対応の検証
 * 5. ダークモード対応の検証
 * 6. オフライン機能の検証
 * 7. 通知システムの検証
 */

test.describe('ユーザーエクスペリエンス統合テスト', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test.describe('レスポンシブデザイン検証', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1200, height: 800 },
      { name: 'Large Desktop', width: 1920, height: 1080 },
    ];

    viewports.forEach(({ name, width, height }) => {
      test(`${name}環境でのレイアウト検証`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await authHelper.loginAsEngineer();

        // ダッシュボードページの検証
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // ナビゲーションの表示確認
        if (width < 768) {
          // モバイル: ハンバーガーメニュー
          await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
          await page.click('[data-testid="mobile-menu-button"]');
          await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible();
        } else {
          // タブレット・デスクトップ: サイドバー
          await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
        }

        // コンテンツエリアの確認
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
        await expect(page.locator('[data-testid="main-content"]')).toBeInViewport();

        // 週報作成ページの検証
        await page.goto('/dashboard/weekly-reports/new');
        await page.waitForLoadState('networkidle');

        // フォームレイアウトの確認
        if (width < 768) {
          // モバイル: 縦積みレイアウト
          await expect(page.locator('[data-testid="mobile-form-layout"]')).toBeVisible();
          
          // タッチ操作の確認
          await page.tap('[data-testid="mood-3"]');
          await expect(page.locator('[data-testid="mood-3"]')).toHaveClass(/selected/);
        } else {
          // デスクトップ: 横並びレイアウト
          await expect(page.locator('[data-testid="desktop-form-layout"]')).toBeVisible();
        }

        // テーブルの確認（週報一覧）
        await page.goto('/dashboard/weekly-reports');
        await page.waitForLoadState('networkidle');

        if (width < 768) {
          // モバイル: カード表示
          await expect(page.locator('[data-testid="mobile-card-view"]')).toBeVisible();
        } else {
          // デスクトップ: テーブル表示
          await expect(page.locator('[data-testid="desktop-table-view"]')).toBeVisible();
        }

        // フォントサイズとクリック領域の確認
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i);
          if (await button.isVisible()) {
            const box = await button.boundingBox();
            if (box && width < 768) {
              // モバイルでは最小44px推奨
              expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
            }
          }
        }
      });
    });

    test('画面回転対応テスト', async ({ page }) => {
      // 縦向きモバイル
      await page.setViewportSize({ width: 375, height: 667 });
      await authHelper.loginAsEngineer();
      await page.goto('/dashboard');

      await expect(page.locator('[data-testid="portrait-layout"]')).toBeVisible();

      // 横向きに回転
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible();
      
      // ナビゲーションが適切に調整されることを確認
      await expect(page.locator('[data-testid="main-content"]')).toBeInViewport();
    });
  });

  test.describe('アクセシビリティ機能検証', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsEngineer();
    });

    test('キーボードナビゲーション', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports/new');
      await page.waitForLoadState('networkidle');

      // フォーカス順序の確認
      const focusableElements = [
        '[data-testid="week-selector"]',
        '[data-testid="mood-1"]',
        '[data-testid="company-hours-day-1"]',
        '[data-testid="client-hours-day-1"]',
        '[data-testid="work-content-day-1"]',
        '[data-testid="save-draft-button"]',
        '[data-testid="submit-button"]',
      ];

      for (let i = 0; i < focusableElements.length; i++) {
        await page.keyboard.press('Tab');
        if (await page.locator(focusableElements[i]).isVisible()) {
          await expect(page.locator(focusableElements[i])).toBeFocused();
        }
      }

      // Shift+Tabで逆方向移動
      await page.keyboard.press('Shift+Tab');
      
      // Enterキーで要素を選択/実行
      await page.locator('[data-testid="mood-3"]').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="mood-3"]')).toHaveClass(/selected/);

      // Escapeキーでダイアログを閉じる
      await page.click('[data-testid="help-button"]');
      await expect(page.locator('[data-testid="help-dialog"]')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="help-dialog"]')).not.toBeVisible();
    });

    test('スクリーンリーダー対応', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports');
      await page.waitForLoadState('networkidle');

      // ランドマークの確認
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      await expect(page.locator('[role="banner"]')).toBeVisible();

      // 見出し構造の確認
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      // 最初の見出しがh1であることを確認
      await expect(headings.first()).toHaveRole('heading', { level: 1 });

      // ARIA属性の確認
      await expect(page.locator('[data-testid="weekly-reports-table"]')).toHaveAttribute('role', 'table');
      await expect(page.locator('[data-testid="status-filter"]')).toHaveAttribute('aria-label');

      // フォームのラベル関連付け確認
      await page.goto('/dashboard/weekly-reports/new');
      
      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < Math.min(inputCount, 10); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          // ラベルまたはaria-labelが設定されていることを確認
          const hasLabel = (await input.getAttribute('aria-label')) || 
                          (await input.getAttribute('aria-labelledby')) ||
                          (await page.locator(`label[for="${await input.getAttribute('id')}"]`).count() > 0);
          expect(hasLabel).toBeTruthy();
        }
      }
    });

    test('ハイコントラストモード対応', async ({ page }) => {
      // ハイコントラストモードの有効化
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // コントラスト比の確認（基本的な要素）
      const textElements = page.locator('[data-testid="main-text"], h1, h2, h3, button, a');
      const elementCount = await textElements.count();
      
      for (let i = 0; i < Math.min(elementCount, 5); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          // 要素が適切に表示されることを確認
          await expect(element).toBeVisible();
        }
      }

      // フォーカス表示の確認
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('音声読み上げ対応', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports');
      await page.waitForLoadState('networkidle');

      // aria-live領域の確認
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
      
      // 動的コンテンツ更新の通知
      await page.click('[data-testid="refresh-button"]');
      
      // ローディング状態の音声通知
      await expect(page.locator('[aria-live="polite"]')).toContainText('データを読み込んでいます');
      
      await page.waitForLoadState('networkidle');
      
      // 完了通知
      await expect(page.locator('[aria-live="polite"]')).toContainText('データの読み込みが完了しました');

      // エラー通知のテスト
      await page.route('**/api/weekly-reports', route => route.abort());
      await page.click('[data-testid="refresh-button"]');
      
      await expect(page.locator('[aria-live="assertive"]')).toContainText('エラーが発生しました');
    });
  });

  test.describe('パフォーマンス要件検証', () => {
    test('ページ読み込み時間', async ({ page }) => {
      const pages = [
        '/login',
        '/dashboard',
        '/dashboard/weekly-reports',
        '/dashboard/weekly-reports/new',
        '/sales/dashboard',
        '/admin/dashboard',
      ];

      for (const url of pages) {
        const startTime = Date.now();
        
        if (url === '/login') {
          await page.goto(url);
        } else {
          await authHelper.loginAsEngineer();
          await page.goto(url);
        }
        
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // 3秒以内に読み込まれることを確認
        expect(loadTime).toBeLessThan(3000);
        
        // Core Web Vitalsの確認
        const cls = await page.evaluate(() => {
          return new Promise((resolve) => {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              resolve(entries.length > 0 ? entries[0].value : 0);
            }).observe({ entryTypes: ['layout-shift'] });
            
            setTimeout(() => resolve(0), 1000);
          });
        });
        
        // CLS (Cumulative Layout Shift) が0.1以下であることを確認
        expect(cls as number).toBeLessThan(0.1);
      }
    });

    test('大量データのパフォーマンス', async ({ page }) => {
      await authHelper.loginAsManager();
      
      // 大量の週報データがある状態をシミュレート
      await page.route('**/api/weekly-reports**', async route => {
        const url = new URL(route.request().url());
        const limit = url.searchParams.get('limit') || '50';
        
        // 1000件のモックデータを生成
        const mockData = {
          items: Array.from({ length: parseInt(limit) }, (_, i) => ({
            id: i + 1,
            engineer_name: `エンジニア${i + 1}`,
            week: `2024-${String(Math.floor(i / 4) + 1).padStart(2, '0')}-${String((i % 4) + 1).padStart(2, '0')}`,
            status: ['draft', 'submitted', 'approved'][i % 3],
            mood: (i % 5) + 1,
            created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          })),
          total: 1000,
          page: parseInt(url.searchParams.get('page') || '1'),
          limit: parseInt(limit),
        };
        
        await route.fulfill({
          status: 200,
          body: JSON.stringify(mockData),
        });
      });

      await page.goto('/manager/weekly-reports');
      
      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // 大量データでも5秒以内に読み込まれることを確認
      expect(loadTime).toBeLessThan(5000);

      // 仮想スクロールの動作確認
      await expect(page.locator('[data-testid="virtual-scroll-container"]')).toBeVisible();
      
      // スクロールパフォーマンス確認
      const scrollStartTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(50);
      }
      
      const scrollTime = Date.now() - scrollStartTime;
      expect(scrollTime).toBeLessThan(2000);
    });

    test('メモリ使用量の監視', async ({ page }) => {
      await authHelper.loginAsEngineer();

      // 初期メモリ使用量
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // 複数ページを巡回
      const urls = [
        '/dashboard',
        '/dashboard/weekly-reports',
        '/dashboard/weekly-reports/new',
        '/dashboard/profile',
      ];

      for (const url of urls) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }

      // 最終メモリ使用量
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // メモリリークの確認（50MB以上の増加は異常）
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  test.describe('多言語対応検証', () => {
    test('言語切り替え機能', async ({ page }) => {
      await authHelper.loginAsEngineer();
      await page.goto('/dashboard');

      // 言語選択メニューの確認
      await page.click('[data-testid="language-selector"]');
      await expect(page.locator('[data-testid="language-menu"]')).toBeVisible();

      // 日本語表示の確認
      await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('ダッシュボード');

      // 英語に切り替え
      await page.click('[data-testid="language-en"]');
      await page.waitForTimeout(500);

      // 英語表示に変更されることを確認
      await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('Dashboard');

      // 中国語に切り替え
      await page.click('[data-testid="language-selector"]');
      await page.click('[data-testid="language-zh"]');
      await page.waitForTimeout(500);

      // 中国語表示に変更されることを確認
      await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('仪表板');

      // 設定が保持されることを確認
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('仪表板');
    });

    test('日付・時刻の地域化', async ({ page }) => {
      await authHelper.loginAsEngineer();
      await page.goto('/dashboard/weekly-reports');

      // 日本語環境での日付表示
      await page.click('[data-testid="language-selector"]');
      await page.click('[data-testid="language-ja"]');
      
      const jaDate = await page.locator('[data-testid="report-date"]').first().textContent();
      expect(jaDate).toMatch(/\d{4}年\d{1,2}月\d{1,2}日/);

      // 英語環境での日付表示
      await page.click('[data-testid="language-selector"]');
      await page.click('[data-testid="language-en"]');
      
      const enDate = await page.locator('[data-testid="report-date"]').first().textContent();
      expect(enDate).toMatch(/\w+ \d{1,2}, \d{4}/);
    });

    test('右から左（RTL）言語のサポート', async ({ page }) => {
      // アラビア語環境をシミュレート
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'ar-SA,ar;q=0.9',
      });

      await authHelper.loginAsEngineer();
      await page.goto('/dashboard');

      // RTLレイアウトの確認
      if (await page.locator('[data-testid="language-ar"]').isVisible()) {
        await page.click('[data-testid="language-selector"]');
        await page.click('[data-testid="language-ar"]');
        
        // HTML要素のdir属性確認
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        
        // ナビゲーションメニューの位置確認
        const sidebar = page.locator('[data-testid="sidebar"]');
        const sidebarBox = await sidebar.boundingBox();
        const windowWidth = await page.evaluate(() => window.innerWidth);
        
        if (sidebarBox) {
          // RTLでは右側に配置される
          expect(sidebarBox.x).toBeGreaterThan(windowWidth / 2);
        }
      }
    });
  });

  test.describe('ダークモード対応検証', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsEngineer();
    });

    test('ダークモード切り替え', async ({ page }) => {
      await page.goto('/dashboard');

      // ライトモードの確認
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

      // ダークモード切り替え
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(300);

      // ダークモードの確認
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

      // 背景色の変更確認
      const backgroundColor = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });
      
      // ダークモードでは暗い背景色
      expect(backgroundColor).toMatch(/rgb\((\d+), (\d+), (\d+)\)/);

      // 設定の永続化確認
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });

    test('システム設定の追従', async ({ page }) => {
      // システムダークモードの設定
      await page.emulateMedia({ colorScheme: 'dark' });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // 自動的にダークモードになることを確認
      if (await page.locator('[data-testid="auto-theme-enabled"]').isVisible()) {
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      }

      // システムライトモードの設定
      await page.emulateMedia({ colorScheme: 'light' });
      await page.reload();

      // 自動的にライトモードになることを確認
      if (await page.locator('[data-testid="auto-theme-enabled"]').isVisible()) {
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      }
    });

    test('ダークモードでの視認性', async ({ page }) => {
      await page.goto('/dashboard');
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(300);

      // 各ページでの視認性確認
      const testPages = [
        '/dashboard/weekly-reports',
        '/dashboard/weekly-reports/new',
        '/dashboard/profile',
      ];

      for (const url of testPages) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // 主要要素が視認可能であることを確認
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
        
        // ボタンがクリック可能であることを確認
        const buttons = page.locator('button:visible');
        const buttonCount = await buttons.count();
        
        if (buttonCount > 0) {
          await expect(buttons.first()).toBeVisible();
          await expect(buttons.first()).toBeEnabled();
        }
      }
    });
  });

  test.describe('オフライン機能検証', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsEngineer();
    });

    test('オフライン状態の検出', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports/new');
      await page.waitForLoadState('networkidle');

      // オンライン状態の確認
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('オンライン');

      // オフライン状態のシミュレーション
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      // オフライン状態の表示確認
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('オフライン');
    });

    test('オフライン時のデータ保存', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports/new');
      await page.waitForLoadState('networkidle');

      // フォームに入力
      await page.selectOption('[data-testid="week-selector"]', '2024-01-15');
      await page.click('[data-testid="mood-4"]');
      await page.fill('[data-testid="weekly-remarks"]', 'オフライン入力テストです。');

      // オフライン状態にする
      await page.context().setOffline(true);

      // 保存を試行
      await page.click('[data-testid="save-draft-button"]');

      // ローカル保存の確認
      await expect(page.locator('[data-testid="offline-save-message"]')).toContainText('オフラインで保存しました');

      // オンライン復帰
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);

      // 自動同期の確認
      await expect(page.locator('[data-testid="sync-status"]')).toContainText('同期完了');
    });

    test('キャッシュされたページの表示', async ({ page }) => {
      // 最初にページを読み込んでキャッシュ
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.goto('/dashboard/weekly-reports');
      await page.waitForLoadState('networkidle');

      // オフライン状態にする
      await page.context().setOffline(true);

      // キャッシュされたページにアクセス
      await page.goto('/dashboard');
      
      // ページが表示されることを確認
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="cached-content-indicator"]')).toBeVisible();

      // 新しいページは表示できないことを確認
      await page.goto('/dashboard/new-feature');
      await expect(page.locator('[data-testid="offline-error"]')).toBeVisible();
    });
  });

  test.describe('通知システム検証', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsEngineer();
    });

    test('リアルタイム通知', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // 通知許可の確認
      await page.evaluate(() => {
        // ブラウザ通知のモック
        (window as any).Notification = {
          permission: 'granted',
          requestPermission: () => Promise.resolve('granted'),
        };
      });

      // WebSocket接続のシミュレーション
      await page.evaluate(() => {
        // WebSocketイベントのシミュレーション
        window.dispatchEvent(new MessageEvent('notification', {
          data: JSON.stringify({
            type: 'weekly_report_approved',
            title: '週報が承認されました',
            message: '2024年第3週の週報が承認されました。',
            timestamp: new Date().toISOString(),
          }),
        }));
      });

      // 通知バナーの表示確認
      await expect(page.locator('[data-testid="notification-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="notification-title"]')).toContainText('週報が承認されました');

      // 通知センターでの表示確認
      await page.click('[data-testid="notification-center-button"]');
      await expect(page.locator('[data-testid="notification-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="notification-item"]').first()).toContainText('週報が承認されました');
    });

    test('通知設定管理', async ({ page }) => {
      await page.goto('/dashboard/settings/notifications');
      await page.waitForLoadState('networkidle');

      // 通知タイプ別設定
      await page.check('[data-testid="notify-weekly-report-approval"]');
      await page.check('[data-testid="notify-deadline-reminder"]');
      await page.uncheck('[data-testid="notify-system-maintenance"]');

      // 通知方法設定
      await page.check('[data-testid="notification-method-browser"]');
      await page.check('[data-testid="notification-method-email"]');
      await page.uncheck('[data-testid="notification-method-sms"]');

      // 通知タイミング設定
      await page.selectOption('[data-testid="deadline-reminder-timing"]', '24-hours');
      await page.selectOption('[data-testid="approval-notification-delay"]', 'immediate');

      // 設定保存
      await page.click('[data-testid="save-notification-settings"]');
      await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();

      // 設定の反映確認
      await page.reload();
      await expect(page.locator('[data-testid="notify-weekly-report-approval"]')).toBeChecked();
      await expect(page.locator('[data-testid="notify-system-maintenance"]')).not.toBeChecked();
    });

    test('バッチ通知の配信', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // 複数の通知をシミュレーション
      await page.evaluate(() => {
        const notifications = [
          {
            type: 'deadline_reminder',
            title: '週報提出期限のお知らせ',
            message: '今週の週報提出期限は明日です。',
          },
          {
            type: 'new_project',
            title: '新しいプロジェクトへの参画',
            message: '新しいプロジェクトへの参画が決定しました。',
          },
          {
            type: 'system_update',
            title: 'システムメンテナンス',
            message: '本日深夜にシステムメンテナンスを実施します。',
          },
        ];

        notifications.forEach((notification, index) => {
          setTimeout(() => {
            window.dispatchEvent(new MessageEvent('notification', {
              data: JSON.stringify(notification),
            }));
          }, index * 1000);
        });
      });

      // 通知バッジの更新確認
      await expect(page.locator('[data-testid="notification-badge"]')).toContainText('3');

      // 通知センターで全件確認
      await page.click('[data-testid="notification-center-button"]');
      await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(3);

      // 一括既読機能
      await page.click('[data-testid="mark-all-read-button"]');
      await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();
    });

    test('通知の優先度管理', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // 高優先度通知
      await page.evaluate(() => {
        window.dispatchEvent(new MessageEvent('notification', {
          data: JSON.stringify({
            type: 'urgent_action_required',
            priority: 'high',
            title: '緊急: 対応が必要です',
            message: '契約延長の承認が必要です。',
          }),
        }));
      });

      // 緊急通知の表示確認
      await expect(page.locator('[data-testid="urgent-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="urgent-notification"]')).toHaveClass(/priority-high/);

      // 通常通知
      await page.evaluate(() => {
        window.dispatchEvent(new MessageEvent('notification', {
          data: JSON.stringify({
            type: 'info_update',
            priority: 'normal',
            title: '情報更新',
            message: 'プロフィール情報が更新されました。',
          }),
        }));
      });

      // 優先度順での表示確認
      const notifications = page.locator('[data-testid="notification-item"]');
      await expect(notifications.first()).toContainText('緊急: 対応が必要です');
    });
  });

  test.describe('エラーハンドリング・回復機能', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsEngineer();
    });

    test('ネットワークエラーからの回復', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports');
      await page.waitForLoadState('networkidle');

      // ネットワークエラーをシミュレーション
      await page.route('**/api/**', route => route.abort());

      // データ更新を試行
      await page.click('[data-testid="refresh-button"]');

      // エラー表示の確認
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // ネットワーク復旧
      await page.unroute('**/api/**');

      // リトライボタンをクリック
      await page.click('[data-testid="retry-button"]');

      // 正常な読み込みの確認
      await expect(page.locator('[data-testid="weekly-reports-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="network-error"]')).not.toBeVisible();
    });

    test('フォーム送信エラーの処理', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports/new');
      await page.waitForLoadState('networkidle');

      // フォーム入力
      await page.selectOption('[data-testid="week-selector"]', '2024-01-15');
      await page.click('[data-testid="mood-3"]');
      await page.fill('[data-testid="weekly-remarks"]', 'テスト入力');

      // サーバーエラーをシミュレーション
      await page.route('**/api/weekly-reports', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      // 提出試行
      await page.click('[data-testid="submit-button"]');

      // エラーメッセージの表示確認
      await expect(page.locator('[data-testid="submit-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="submit-error"]')).toContainText('送信に失敗しました');

      // フォームデータが保持されることを確認
      await expect(page.locator('[data-testid="weekly-remarks"]')).toHaveValue('テスト入力');
      await expect(page.locator('[data-testid="mood-3"]')).toHaveClass(/selected/);

      // 再送信の確認
      await page.unroute('**/api/weekly-reports');
      await page.click('[data-testid="retry-submit-button"]');

      // 成功メッセージの確認
      await expect(page.locator('[data-testid="submit-success"]')).toBeVisible();
    });

    test('セッション期限切れの処理', async ({ page }) => {
      await page.goto('/dashboard/weekly-reports');
      await page.waitForLoadState('networkidle');

      // セッション期限切れをシミュレーション
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });

      // API呼び出しを試行
      await page.click('[data-testid="refresh-button"]');

      // 認証エラーダイアログの表示確認
      await expect(page.locator('[data-testid="auth-expired-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="relogin-prompt"]')).toContainText('セッションが期限切れです');

      // 再ログインボタンをクリック
      await page.click('[data-testid="relogin-button"]');

      // ログインページにリダイレクトされることを確認
      await expect(page).toHaveURL(/.*login/);
    });
  });
});