import { test, expect } from '@playwright/test'
import { uiLogin, hasCreds } from './utils/auth'
test.use({ storageState: 'e2e/.auth/engineer.json' })

// Skip when E2E creds are not provided (CI will inject secrets)
test.skip(!hasCreds(), 'E2E credentials not set; skipping skill sheet smoke test')

// Minimal SkillSheet payload to render the page
const minimalSkillSheet = {
  user_id: 'user-1',
  email: 'engineer@example.com',
  first_name: 'Taro',
  last_name: 'Yamada',
  first_name_kana: 'タロウ',
  last_name_kana: 'ヤマダ',
  work_histories: [],
  technical_skills: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

test.describe('Skill Sheet - Smoke', () => {
  test('@smoke login → open /skill-sheet → add work history dialog opens', async ({ page }) => {
    // Stub Skill Sheet GET
    await page.route('**/api/v1/skill-sheet', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(minimalSkillSheet),
        })
      }
      return route.fallback()
    })

    await uiLogin(page)

    // Navigate to skill sheet page
    await page.goto('/skill-sheet')
    await expect(page.getByTestId('skill-sheet-form-container')).toBeVisible()
    await expect(page.getByTestId('skill-sheet-filter-bar')).toBeVisible()

    // Open Add Work History dialog
    const addButton = page.getByRole('button', { name: '職務経歴を追加' })
    await expect(addButton).toBeVisible()
    await addButton.click()

    // Dialog shows with basic fields
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByLabel('プロジェクト名')).toBeVisible()

    // Close dialog (no save)
    await page.getByRole('button', { name: 'キャンセル' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  })
})
