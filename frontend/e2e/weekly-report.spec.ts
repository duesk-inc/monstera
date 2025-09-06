import { test, expect } from '@playwright/test'
test.use({ storageState: 'e2e/.auth/engineer.json' })
import { uiLogin, hasCreds } from './utils/auth'

test.describe('Weekly report smoke', () => {
  test('@smoke open weekly report page and basic elements', async ({ page }) => {
    test.skip(!hasCreds(), 'E2E credentials not provided')
    await uiLogin(page)

    await page.goto('/weekly-report')
    await expect(page.getByTestId('weekly-report-page')).toBeVisible()

    // ヘッダーの主要アクションの存在を軽く確認（テキスト/ロールベース）
    await expect(page.getByRole('button', { name: '下書き保存' })).toBeVisible()
    await expect(page.getByRole('button', { name: '提出する' })).toBeVisible()
  })
})
