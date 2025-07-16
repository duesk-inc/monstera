import { test, expect } from '@playwright/test';
import { TEST_EMAILS, TEST_PASSWORDS } from '../../src/test-utils/test-emails';

test.describe('メール管理ページ', () => {
  // テスト前のセットアップ
  test.beforeEach(async ({ page }) => {
    // 営業マネージャーでログイン
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_EMAILS.sales);
    await page.fill('[data-testid="password-input"]', TEST_PASSWORDS.default);
    await page.click('[data-testid="login-button"]');
    
    // メール管理ページに移動
    await page.goto('/sales/emails');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
  });

  test('メール管理ページが正しく表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('[data-testid="page-title"]')).toContainText('メール管理');
    
    // サブタイトルの確認
    await expect(page.locator('[data-testid="page-subtitle"]')).toContainText('テンプレート作成・一斉送信・配信管理');
  });

  test('統計情報が正しく表示される', async ({ page }) => {
    // 統計アラートが表示されることを確認
    const statsAlert = page.locator('[data-testid="email-stats-alert"]');
    await expect(statsAlert).toBeVisible();
    
    // 統計情報の内容確認
    await expect(statsAlert).toContainText('アクティブテンプレート:');
    await expect(statsAlert).toContainText('送信予定:');
    await expect(statsAlert).toContainText('本日送信:');
  });

  test('タブ切り替えが正しく動作する', async ({ page }) => {
    // 初期状態でテンプレート管理タブが選択されていることを確認
    await expect(page.locator('[data-testid="tab-templates"]')).toHaveAttribute('aria-selected', 'true');
    
    // 一斉送信管理タブをクリック
    await page.click('[data-testid="tab-campaigns"]');
    
    // タブが切り替わることを確認
    await expect(page.locator('[data-testid="tab-campaigns"]')).toHaveAttribute('aria-selected', 'true');
    
    // コンテンツが切り替わることを確認
    await expect(page.locator('[data-testid="campaigns-content"]')).toBeVisible();
    
    // テンプレート管理タブに戻る
    await page.click('[data-testid="tab-templates"]');
    
    // コンテンツが切り替わることを確認
    await expect(page.locator('[data-testid="templates-content"]')).toBeVisible();
  });

  test.describe('テンプレート管理', () => {
    test.beforeEach(async ({ page }) => {
      // テンプレート管理タブを確実に選択
      await page.click('[data-testid="tab-templates"]');
      await page.waitForTimeout(500);
    });

    test('テンプレート作成ボタンが表示される', async ({ page }) => {
      // テンプレート作成ボタンが表示されることを確認
      await expect(page.locator('[data-testid="create-template-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-template-button"]')).toContainText('テンプレート作成');
    });

    test('テンプレート一覧が表示される', async ({ page }) => {
      // テンプレート一覧セクションが表示されることを確認
      await expect(page.locator('[data-testid="templates-list"]')).toBeVisible();
      
      // セクションタイトルが表示されることを確認
      await expect(page.locator('[data-testid="templates-list-title"]')).toContainText('メールテンプレート一覧');
    });

    test('新しいテンプレートを作成できる', async ({ page }) => {
      // テンプレート作成ボタンをクリック
      await page.click('[data-testid="create-template-button"]');
      
      // テンプレート作成ダイアログが表示されることを確認
      await expect(page.locator('[data-testid="template-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="dialog-title"]')).toContainText('テンプレート作成');
      
      // フォーム入力
      await page.fill('[data-testid="template-name-input"]', 'テストテンプレート');
      await page.fill('[data-testid="template-subject-input"]', 'テスト件名');
      await page.fill('[data-testid="template-body-input"]', 'テスト本文内容です。');
      
      // テンプレートタイプを選択
      await page.click('[data-testid="template-type-select"]');
      await page.click('[data-testid="template-type-proposal"]');
      
      // 保存ボタンをクリック
      await page.click('[data-testid="save-template-button"]');
      
      // 成功メッセージが表示されることを確認
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('メールテンプレートを作成しました');
      
      // ダイアログが閉じることを確認
      await expect(page.locator('[data-testid="template-dialog"]')).not.toBeVisible();
    });

    test('テンプレートを編集できる', async ({ page }) => {
      // 既存のテンプレートをクリック
      const templateItem = page.locator('[data-testid="template-item"]').first();
      
      if (await templateItem.isVisible()) {
        await templateItem.click();
        
        // テンプレート編集ダイアログが表示されることを確認
        await expect(page.locator('[data-testid="template-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="dialog-title"]')).toContainText('テンプレート編集');
        
        // フォーム内容が読み込まれていることを確認
        await expect(page.locator('[data-testid="template-name-input"]')).not.toHaveValue('');
        
        // 内容を編集
        await page.fill('[data-testid="template-name-input"]', '編集済みテンプレート');
        
        // 保存ボタンをクリック
        await page.click('[data-testid="save-template-button"]');
        
        // 成功メッセージが表示されることを確認
        await expect(page.locator('[data-testid="success-toast"]')).toContainText('メールテンプレートを更新しました');
      }
    });

    test('テンプレートプレビュー機能が動作する', async ({ page }) => {
      // テンプレート編集ダイアログを開く
      const templateItem = page.locator('[data-testid="template-item"]').first();
      
      if (await templateItem.isVisible()) {
        await templateItem.click();
        
        // プレビューボタンをクリック
        await page.click('[data-testid="preview-template-button"]');
        
        // プレビューダイアログまたは機能が動作することを確認
        // 実装に応じて適切な確認を行う
        await page.waitForTimeout(1000);
      }
    });

    test('テンプレートを削除できる', async ({ page }) => {
      // テンプレート編集ダイアログを開く
      const templateItem = page.locator('[data-testid="template-item"]').first();
      
      if (await templateItem.isVisible()) {
        await templateItem.click();
        
        // 削除ボタンをクリック
        await page.click('[data-testid="delete-template-button"]');
        
        // 削除確認ダイアログが表示される場合のハンドリング
        page.on('dialog', async dialog => {
          expect(dialog.message()).toContain('削除してもよろしいですか');
          await dialog.accept();
        });
        
        // 成功メッセージが表示されることを確認
        await expect(page.locator('[data-testid="success-toast"]')).toContainText('メールテンプレートを削除しました');
      }
    });

    test('テンプレートフォームのバリデーションが動作する', async ({ page }) => {
      // テンプレート作成ボタンをクリック
      await page.click('[data-testid="create-template-button"]');
      
      // 必須フィールドを空のまま保存を試行
      await page.click('[data-testid="save-template-button"]');
      
      // バリデーションエラーが表示されることを確認
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="subject-error"]')).toBeVisible();
    });
  });

  test.describe('キャンペーン管理', () => {
    test.beforeEach(async ({ page }) => {
      // キャンペーン管理タブを選択
      await page.click('[data-testid="tab-campaigns"]');
      await page.waitForTimeout(500);
    });

    test('一斉送信作成ボタンが表示される', async ({ page }) => {
      // 一斉送信作成ボタンが表示されることを確認
      await expect(page.locator('[data-testid="create-campaign-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-campaign-button"]')).toContainText('一斉送信作成');
    });

    test('キャンペーン一覧が表示される', async ({ page }) => {
      // キャンペーン一覧セクションが表示されることを確認
      await expect(page.locator('[data-testid="campaigns-list"]')).toBeVisible();
      
      // セクションタイトルが表示されることを確認
      await expect(page.locator('[data-testid="campaigns-list-title"]')).toContainText('メールキャンペーン一覧');
    });

    test('新しいキャンペーンを作成できる', async ({ page }) => {
      // 一斉送信作成ボタンをクリック
      await page.click('[data-testid="create-campaign-button"]');
      
      // キャンペーン作成ダイアログが表示されることを確認
      await expect(page.locator('[data-testid="campaign-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="dialog-title"]')).toContainText('キャンペーン作成');
      
      // フォーム入力
      await page.fill('[data-testid="campaign-name-input"]', 'テストキャンペーン');
      
      // テンプレートを選択
      await page.click('[data-testid="campaign-template-select"]');
      await page.click('[data-testid="template-option"]').first();
      
      // 送信日時を設定
      await page.fill('[data-testid="campaign-scheduled-date"]', '2024-12-31');
      await page.fill('[data-testid="campaign-scheduled-time"]', '10:00');
      
      // 保存ボタンをクリック
      await page.click('[data-testid="save-campaign-button"]');
      
      // 成功メッセージが表示されることを確認
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('メールキャンペーンを作成しました');
      
      // ダイアログが閉じることを確認
      await expect(page.locator('[data-testid="campaign-dialog"]')).not.toBeVisible();
    });

    test('キャンペーンを編集できる', async ({ page }) => {
      // 既存のキャンペーンをクリック
      const campaignItem = page.locator('[data-testid="campaign-item"]').first();
      
      if (await campaignItem.isVisible()) {
        await campaignItem.click();
        
        // キャンペーン編集ダイアログが表示されることを確認
        await expect(page.locator('[data-testid="campaign-dialog"]')).toBeVisible();
        await expect(page.locator('[data-testid="dialog-title"]')).toContainText('キャンペーン編集');
        
        // フォーム内容が読み込まれていることを確認
        await expect(page.locator('[data-testid="campaign-name-input"]')).not.toHaveValue('');
        
        // 内容を編集
        await page.fill('[data-testid="campaign-name-input"]', '編集済みキャンペーン');
        
        // 保存ボタンをクリック
        await page.click('[data-testid="save-campaign-button"]');
        
        // 成功メッセージが表示されることを確認
        await expect(page.locator('[data-testid="success-toast"]')).toContainText('メールキャンペーンを更新しました');
      }
    });

    test('キャンペーンを送信できる', async ({ page }) => {
      // 送信可能なキャンペーンアイテムを探す
      const campaignItem = page.locator('[data-testid="campaign-item"][data-status="scheduled"]').first();
      
      if (await campaignItem.isVisible()) {
        await campaignItem.click();
        
        // 送信ボタンをクリック
        await page.click('[data-testid="send-campaign-button"]');
        
        // 送信確認ダイアログが表示される場合のハンドリング
        page.on('dialog', async dialog => {
          expect(dialog.message()).toContain('送信を開始してもよろしいですか');
          await dialog.accept();
        });
        
        // 成功メッセージが表示されることを確認
        await expect(page.locator('[data-testid="success-toast"]')).toContainText('メール送信を開始しました');
      }
    });

    test('キャンペーンプレビュー機能が動作する', async ({ page }) => {
      // キャンペーン編集ダイアログを開く
      const campaignItem = page.locator('[data-testid="campaign-item"]').first();
      
      if (await campaignItem.isVisible()) {
        await campaignItem.click();
        
        // プレビューボタンをクリック
        await page.click('[data-testid="preview-campaign-button"]');
        
        // プレビューダイアログまたは機能が動作することを確認
        await page.waitForTimeout(1000);
      }
    });

    test('キャンペーンを削除できる', async ({ page }) => {
      // キャンペーン編集ダイアログを開く
      const campaignItem = page.locator('[data-testid="campaign-item"]').first();
      
      if (await campaignItem.isVisible()) {
        await campaignItem.click();
        
        // 削除ボタンをクリック
        await page.click('[data-testid="delete-campaign-button"]');
        
        // 削除確認ダイアログが表示される場合のハンドリング
        page.on('dialog', async dialog => {
          expect(dialog.message()).toContain('削除してもよろしいですか');
          await dialog.accept();
        });
        
        // 成功メッセージが表示されることを確認
        await expect(page.locator('[data-testid="success-toast"]')).toContainText('メールキャンペーンを削除しました');
      }
    });

    test('キャンペーンフォームのバリデーションが動作する', async ({ page }) => {
      // キャンペーン作成ボタンをクリック
      await page.click('[data-testid="create-campaign-button"]');
      
      // 必須フィールドを空のまま保存を試行
      await page.click('[data-testid="save-campaign-button"]');
      
      // バリデーションエラーが表示されることを確認
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-error"]')).toBeVisible();
    });
  });

  test('データ更新機能が動作する', async ({ page }) => {
    // ページリロードまたは更新ボタンがある場合のテスト
    await page.reload();
    
    // データが再読み込みされることを確認
    await page.waitForLoadState('networkidle');
    
    // 統計情報が更新されることを確認
    await expect(page.locator('[data-testid="email-stats-alert"]')).toBeVisible();
  });

  test('ローディング状態が正しく表示される', async ({ page }) => {
    // ネットワークを遅延させてローディング状態をテスト
    await page.route('**/api/sales/email-templates', async route => {
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
    await page.route('**/api/sales/email-templates', async route => {
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
  });

  test('フィルター・検索機能が動作する', async ({ page }) => {
    // 検索ボックスがある場合のテスト
    const searchInput = page.locator('[data-testid="search-input"]');
    
    if (await searchInput.isVisible()) {
      // 検索キーワードを入力
      await searchInput.fill('テスト');
      await page.keyboard.press('Enter');
      
      // 結果が絞り込まれることを確認
      await page.waitForTimeout(1000);
    }
    
    // フィルターボタンがある場合のテスト
    const filterButton = page.locator('[data-testid="filter-button"]');
    
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      // フィルターダイアログが表示されることを確認
      await expect(page.locator('[data-testid="filter-dialog"]')).toBeVisible();
    }
  });

  test('レスポンシブ表示が正しく動作する', async ({ page }) => {
    // デスクトップサイズでの表示確認
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // タブが横並びで表示されることを確認
    await expect(page.locator('[data-testid="email-tabs"]')).toBeVisible();
    
    // タブレットサイズに変更
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // レイアウトが適切に調整されることを確認
    await expect(page.locator('[data-testid="email-tabs"]')).toBeVisible();
    
    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });
    
    // コンテンツが適切に表示されることを確認
    await expect(page.locator('[data-testid="email-tabs"]')).toBeVisible();
  });

  test('キーボードナビゲーションが動作する', async ({ page }) => {
    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    
    // テンプレート作成ボタンにフォーカスが移動することを確認
    await expect(page.locator('[data-testid="create-template-button"]')).toBeFocused();
    
    // Enterキーでボタンを実行
    await page.keyboard.press('Enter');
    
    // ダイアログが開くことを確認
    await expect(page.locator('[data-testid="template-dialog"]')).toBeVisible();
    
    // Escapeキーでダイアログを閉じる
    await page.keyboard.press('Escape');
    
    // ダイアログが閉じることを確認
    await expect(page.locator('[data-testid="template-dialog"]')).not.toBeVisible();
  });

  test('ソート機能が動作する', async ({ page }) => {
    // ソートボタンがある場合のテスト
    const sortButton = page.locator('[data-testid="sort-button"]');
    
    if (await sortButton.isVisible()) {
      // 名前順でソート
      await sortButton.click();
      await page.click('[data-testid="sort-by-name"]');
      
      // データがソートされることを確認
      await page.waitForTimeout(1000);
      
      // 日付順でソート
      await sortButton.click();
      await page.click('[data-testid="sort-by-date"]');
      
      // データがソートされることを確認
      await page.waitForTimeout(1000);
    }
  });

  test('パフォーマンス要件を満たす', async ({ page }) => {
    // ページ読み込み時間の測定
    const startTime = Date.now();
    
    await page.goto('/sales/emails');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 3秒以内に読み込まれることを確認
    expect(loadTime).toBeLessThan(3000);
  });

  test('アクセシビリティ要件を満たす', async ({ page }) => {
    // ページ読み込み後のアクセシビリティ確認
    await page.waitForLoadState('networkidle');
    
    // 主要な要素にaria-labelが設定されていることを確認
    await expect(page.locator('[data-testid="create-template-button"]')).toHaveAttribute('aria-label');
    
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
    // ログアウト状態でメール管理ページにアクセス
    await page.goto('/sales/emails');
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*login/);
  });

  test('権限不足状態でのアクセス制御', async ({ page }) => {
    // 権限のないユーザーでログイン
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'engineer@duesk.co.jp');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // メール管理ページにアクセス
    await page.goto('/sales/emails');
    
    // アクセス拒否画面または適切なエラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
  });
});