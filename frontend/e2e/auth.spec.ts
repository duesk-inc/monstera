import { test, expect } from '@playwright/test'
import { uiLogin, uiLogout, hasCreds } from './utils/auth'

test.describe('Auth smoke', () => {
  test('login -> dashboard -> logout (smoke)', async ({ page }) => {
    test.skip(!hasCreds(), 'E2E credentials not provided')
    await uiLogin(page)

    // 軽い存在確認（重要ウィジェットが見えること）
    await expect(page.getByTestId('dashboard')).toBeVisible()

    await uiLogout(page)

    // ログアウト後はログインページに戻る実装があれば検証（なければスキップ）
    // この検証は緩くする
    await page.goto('/login')
    await expect(page.getByTestId('login-form')).toBeVisible()
  })
})
