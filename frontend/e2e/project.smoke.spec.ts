import { test, expect } from '@playwright/test'
import { uiLogin } from './utils/auth'

test.describe('Project Smoke: list → (detail)', () => {
  test('shows project list and opens detail when available', async ({ page }) => {
    await uiLogin(page)

    // List page
    await page.goto('/project')
    await expect(page.getByRole('heading', { name: '案件情報' })).toBeVisible()

    // Either empty-state or at least one card with 詳細を見る
    const detailButtons = page.getByRole('button', { name: /詳細を見る/ })
    const emptyState = page.getByText('案件が見つかりません')

    // Wait a moment for data render via client fetch
    await Promise.race([
      detailButtons.first().waitFor({ state: 'visible' }).catch(() => {}),
      emptyState.first().waitFor({ state: 'visible' }).catch(() => {}),
      page.waitForTimeout(1000), // minimal cushion; we avoid fixed waits otherwise
    ])

    if (await detailButtons.count()) {
      await detailButtons.first().click()
      await page.waitForURL('**/project/detail**')
      // Breadcrumb contains 案件詳細
      await expect(page.getByText('案件詳細')).toBeVisible()
    } else {
      // Accept empty list as a valid smoke outcome
      await expect(emptyState).toBeVisible()
    }
  })
})
