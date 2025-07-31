# E2Eテスト実装パターン

## Playwright設定
Monsteraプロジェクトでは、PlaywrightをE2Eテストフレームワークとして使用。

## テスト構造
```typescript
test.describe('機能グループ', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // テスト用ログイン
    await testLogin(page, 'role');
    
    // 対象画面に遷移
    await page.goto('/target-path');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('サブ機能', () => {
    test('テストケース名', async () => {
      // Arrange
      const element = page.locator('selector');
      
      // Act
      await element.click();
      
      // Assert
      await expect(element).toBeVisible();
    });
  });
});
```

## 主要なテストパターン

### 1. 要素の存在確認
```typescript
await expect(page.locator('selector')).toBeVisible();
await expect(page.locator('selector')).toHaveCount(0); // 存在しない
```

### 2. 条件付き要素
```typescript
const element = page.locator('selector');
if (await element.count() > 0) {
  // 要素が存在する場合の処理
}
```

### 3. ナビゲーション確認
```typescript
await expect(page).toHaveURL(/pattern/);
await expect(page).toHaveURL('/exact-path');
```

### 4. キーボード操作
```typescript
await element.focus();
await page.keyboard.press('Enter');
```

### 5. レスポンシブテスト
```typescript
await page.setViewportSize({ width: 375, height: 667 }); // モバイル
```

### 6. アクセシビリティテスト
```typescript
const ariaLabel = await element.getAttribute('aria-label');
expect(ariaLabel).toBeTruthy();
```

### 7. スタイル検証
```typescript
const style = await element.evaluate(el => 
  window.getComputedStyle(el).propertyName
);
```

## ベストプラクティス
- `waitForLoadState('networkidle')` で確実な画面遷移を待つ
- セレクターは data-testid を優先的に使用
- 条件付きアサーションで堅牢性を高める
- エラーケースも必ずテストする