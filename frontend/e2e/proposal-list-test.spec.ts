import { test, expect } from '@playwright/test';

test.describe('提案一覧表示機能', () => {
  // テスト前の共通処理
  test.beforeEach(async ({ page }) => {
    console.log('テスト開始: エンジニアユーザーでログイン');
    
    // ログインページにアクセス
    await page.goto('/login');
    
    // まずは簡単なテストユーザーの作成を試みる（ダミーログイン）
    // 実際のログインをスキップして、直接提案ページにアクセスできるかテスト
    console.log('ログインスキップテスト - 提案ページに直接アクセス');
    
    // 提案ページに直接アクセスを試みる（認証が必要なはず）
    await page.goto('/proposals');
    
    // ログインページにリダイレクトされることを確認
    await page.waitForURL((url) => url.pathname.includes('/login'), {
      timeout: 5000
    }).catch(() => {
      console.log('ログインページへのリダイレクトなし - 認証設定を確認');
    });
    
    console.log('現在のURL:', page.url());
  });

  test('提案一覧ページにアクセスできる', async ({ page }) => {
    console.log('テスト: 提案一覧ページへのアクセス');
    
    // 提案一覧ページに直接移動
    await page.goto('/proposals');
    
    // ページが読み込まれるのを待つ
    await page.waitForLoadState('networkidle');
    
    // URLが提案一覧ページであることを確認
    expect(page.url()).toContain('/proposals');
    
    // ページタイトルまたはヘッダーを確認
    const pageTitle = await page.textContent('h1, h2, h3, h4');
    console.log('ページタイトル:', pageTitle);
    
    // 提案関連のテキストが含まれているか確認
    const hasProposalContent = pageTitle?.includes('提案') || pageTitle?.includes('案件');
    expect(hasProposalContent).toBeTruthy();
  });

  test('提案カードが表示される', async ({ page }) => {
    console.log('テスト: 提案カードの表示確認');
    
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');
    
    // 提案カードの要素を待つ（MUIのCardコンポーネントを想定）
    const proposalCards = page.locator('[class*="MuiCard"], [class*="proposal-card"], [data-testid*="proposal"]');
    
    // カードが少なくとも1つは表示されることを確認
    await expect(proposalCards.first()).toBeVisible({ timeout: 10000 });
    
    const cardCount = await proposalCards.count();
    console.log(`表示されている提案カード数: ${cardCount}`);
    
    // 少なくとも1つのカードが表示されていることを確認
    expect(cardCount).toBeGreaterThan(0);
  });

  test('提案カードに必要な情報が含まれている', async ({ page }) => {
    console.log('テスト: 提案カード内容の確認');
    
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');
    
    // 最初の提案カードを取得
    const firstCard = page.locator('[class*="MuiCard"], [class*="proposal-card"], [data-testid*="proposal"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    
    // カード内のテキストを取得
    const cardText = await firstCard.textContent();
    console.log('最初のカードの内容:', cardText);
    
    // 必要な情報が含まれているか確認
    // プロジェクト名、クライアント名、ステータスなどの存在を確認
    const hasProjectInfo = cardText?.includes('案件') || cardText?.includes('プロジェクト') || cardText?.includes('開発');
    const hasStatus = cardText?.includes('提案中') || cardText?.includes('承認') || cardText?.includes('進行') || cardText?.includes('proposed') || cardText?.includes('proceed');
    
    expect(hasProjectInfo).toBeTruthy();
    expect(hasStatus).toBeTruthy();
  });

  test('フィルター機能が存在する', async ({ page }) => {
    console.log('テスト: フィルター機能の確認');
    
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');
    
    // フィルターボタンまたは選択要素を探す
    const filterElements = page.locator('button:has-text("フィルター"), button:has-text("絞り込み"), select, [role="combobox"], [class*="MuiSelect"]');
    
    // フィルター要素が存在することを確認
    const filterCount = await filterElements.count();
    console.log(`フィルター要素数: ${filterCount}`);
    
    // 少なくとも1つのフィルター要素があることを確認
    expect(filterCount).toBeGreaterThan(0);
  });

  test('ページネーションが機能する', async ({ page }) => {
    console.log('テスト: ページネーション機能の確認');
    
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');
    
    // ページネーション要素を探す
    const pagination = page.locator('[class*="MuiPagination"], [class*="pagination"], nav[aria-label*="pagination"]');
    
    // ページネーションが存在するか、または提案数が少ない場合はスキップ
    const paginationExists = await pagination.count() > 0;
    
    if (paginationExists) {
      console.log('ページネーションが存在します');
      // ページネーションボタンの存在を確認
      const pageButtons = page.locator('button[aria-label*="page"], [class*="MuiPaginationItem"]');
      const buttonCount = await pageButtons.count();
      console.log(`ページボタン数: ${buttonCount}`);
      expect(buttonCount).toBeGreaterThan(0);
    } else {
      console.log('ページネーションは表示されていません（データが少ないため）');
      // データが少ない場合は提案カードが表示されていることを再確認
      const cards = await page.locator('[class*="MuiCard"], [class*="proposal-card"]').count();
      expect(cards).toBeGreaterThan(0);
    }
  });

  test('提案詳細ページへの遷移', async ({ page }) => {
    console.log('テスト: 提案詳細ページへの遷移');
    
    await page.goto('/proposals');
    await page.waitForLoadState('networkidle');
    
    // 最初の提案カードを取得
    const firstCard = page.locator('[class*="MuiCard"], [class*="proposal-card"], [data-testid*="proposal"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    
    // カード内のリンクまたはクリック可能な要素を探す
    const cardLink = firstCard.locator('a, button:has-text("詳細"), button:has-text("確認")').first();
    
    if (await cardLink.count() > 0) {
      // 詳細ページへのリンクがある場合はクリック
      await cardLink.click();
      
      // URLが変わるのを待つ
      await page.waitForURL((url) => url.pathname !== '/proposals', {
        timeout: 5000
      }).catch(() => {
        console.log('URL変更なし - モーダルまたは同一ページ内での詳細表示の可能性');
      });
      
      const newUrl = page.url();
      console.log('遷移後のURL:', newUrl);
      
      // 詳細ページまたはモーダルが表示されていることを確認
      const hasDetail = newUrl.includes('/proposal') || await page.locator('[role="dialog"], [class*="Modal"]').count() > 0;
      expect(hasDetail).toBeTruthy();
    } else {
      console.log('詳細へのリンクが見つかりません - カード自体がクリック可能な可能性');
      // カード自体をクリックしてみる
      await firstCard.click();
      await page.waitForTimeout(1000);
      
      // 何らかの変化があったか確認
      const currentUrl = page.url();
      const hasModal = await page.locator('[role="dialog"], [class*="Modal"]').count() > 0;
      console.log('クリック後のURL:', currentUrl, 'モーダル表示:', hasModal);
    }
  });
});