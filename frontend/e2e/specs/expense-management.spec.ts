import { test, expect, Page } from '@playwright/test';
import { testLogin } from '../helpers/test-auth-helper';

/**
 * 経費申請管理のE2Eテスト
 * 経費申請一覧画面の編集機能をテスト
 */
test.describe('経費申請管理', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // テスト用ログイン
    await testLogin(page, 'engineer');
    
    // 経費申請一覧画面に遷移
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('経費申請一覧の編集機能', () => {
    test('下書き状態の経費申請に編集ボタンが表示される', async () => {
      // 下書き状態の行を探す
      const draftRow = page.locator('tr.editable-row').first();
      await expect(draftRow).toBeVisible();
      
      // 編集ボタンが表示されることを確認
      const editButton = draftRow.locator('button[aria-label*="編集"]');
      await expect(editButton).toBeVisible();
      
      // ボタンがクリック可能であることを確認
      await expect(editButton).toBeEnabled();
    });

    test('提出済みの経費申請には編集ボタンが表示されない', async () => {
      // 提出済みステータスを含む行を探す
      const submittedRow = page.locator('tr:has-text("提出済み")').first();
      
      if (await submittedRow.count() > 0) {
        // 編集ボタンが存在しないことを確認
        const editButton = submittedRow.locator('button[aria-label*="編集"]');
        await expect(editButton).toHaveCount(0);
      }
    });

    test('編集ボタンクリックで編集画面に遷移する', async () => {
      // 下書き状態の編集ボタンを探してクリック
      const editButton = page.locator('tr.editable-row').first().locator('button[aria-label*="編集"]');
      await editButton.click();
      
      // 編集画面に遷移することを確認
      await expect(page).toHaveURL(/\/expenses\/[\w-]+\/edit/);
      
      // 編集画面の要素が表示されることを確認
      await expect(page.locator('h1:has-text("経費申請編集")')).toBeVisible();
    });

    test('キーボードナビゲーションで編集画面に遷移する', async () => {
      // 編集ボタンにフォーカス
      const editButton = page.locator('tr.editable-row').first().locator('button[aria-label*="編集"]');
      await editButton.focus();
      
      // Enterキーで遷移
      await page.keyboard.press('Enter');
      
      // 編集画面に遷移することを確認
      await expect(page).toHaveURL(/\/expenses\/[\w-]+\/edit/);
    });

    test('編集可能行が視覚的に区別される', async () => {
      // 下書き状態の行を取得
      const draftRow = page.locator('tr.editable-row').first();
      
      // 背景色が設定されていることを確認
      const backgroundColor = await draftRow.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // primary.50の色（薄い青色）が適用されていることを確認
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // 透明でない
      expect(backgroundColor).not.toBe('rgb(255, 255, 255)'); // 白色でない
    });

    test('モバイル表示で編集ボタンが適切に表示される', async () => {
      // モバイルビューポートに変更
      await page.setViewportSize({ width: 375, height: 667 });
      
      // 編集ボタンを取得
      const editButton = page.locator('tr.editable-row').first().locator('button[aria-label*="編集"]');
      await expect(editButton).toBeVisible();
      
      // モバイルでボタンサイズが大きくなっていることを確認
      const size = await editButton.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      
      // 48px以上のタッチターゲットサイズを確認
      expect(size.width).toBeGreaterThanOrEqual(48);
      expect(size.height).toBeGreaterThanOrEqual(48);
    });

    test('複数の下書き経費申請がある場合の動作', async () => {
      // すべての編集可能行を取得
      const editableRows = page.locator('tr.editable-row');
      const rowCount = await editableRows.count();
      
      if (rowCount > 1) {
        // 各行に編集ボタンがあることを確認
        for (let i = 0; i < rowCount; i++) {
          const editButton = editableRows.nth(i).locator('button[aria-label*="編集"]');
          await expect(editButton).toBeVisible();
        }
      }
    });

    test('編集ボタンのホバーエフェクト', async () => {
      const editButton = page.locator('tr.editable-row').first().locator('button[aria-label*="編集"]');
      
      // ホバー前の状態を記録
      const beforeHover = await editButton.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // ホバー
      await editButton.hover();
      
      // ホバー後の状態を確認
      const afterHover = await editButton.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // トランスフォームが適用されていることを確認
      expect(afterHover).not.toBe(beforeHover);
      expect(afterHover).toContain('scale');
    });

    test('アクセシビリティ: スクリーンリーダー対応', async () => {
      const editButton = page.locator('tr.editable-row').first().locator('button[aria-label*="編集"]');
      
      // aria-labelが適切に設定されていることを確認
      const ariaLabel = await editButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('編集');
      
      // titleも設定されていることを確認
      const title = await editButton.getAttribute('title');
      expect(title).toBeTruthy();
      expect(title).toContain('編集');
    });

    test('ページネーション時の編集ボタン表示', async () => {
      // ページネーションがある場合
      const pagination = page.locator('[data-testid="history-table-pagination"]');
      
      if (await pagination.isVisible()) {
        // 次のページに移動
        const nextButton = pagination.locator('button[aria-label="Next page"]');
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
          
          // 新しいページでも編集ボタンが正しく表示されることを確認
          const editableRows = page.locator('tr.editable-row');
          if (await editableRows.count() > 0) {
            const editButton = editableRows.first().locator('button[aria-label*="編集"]');
            await expect(editButton).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('エラーケース', () => {
    test('編集権限のない経費申請へのアクセス', async () => {
      // 直接URLで他のステータスの編集画面にアクセスを試みる
      // (実際のIDは環境に応じて調整が必要)
      await page.goto('/expenses/submitted-expense-id/edit');
      
      // エラーメッセージまたはリダイレクトを確認
      const errorMessage = page.locator('text=/編集できません|権限がありません/');
      const isRedirected = page.url().includes('/expenses') && !page.url().includes('/edit');
      
      expect(await errorMessage.isVisible() || isRedirected).toBeTruthy();
    });

    test('存在しない経費申請の編集', async () => {
      // 存在しないIDで編集画面にアクセス
      await page.goto('/expenses/non-existent-id/edit');
      
      // 404エラーまたはエラーメッセージを確認
      const notFound = page.locator('text=/見つかりません|404|Not Found/');
      await expect(notFound).toBeVisible({ timeout: 10000 });
    });
  });
});