import { test, expect } from '@playwright/test'
import { uiLogin, hasCreds } from './utils/auth'
test.use({ storageState: 'e2e/.auth/engineer.json' })

// Skip when E2E creds are not provided (CI will inject secrets)
test.skip(!hasCreds(), 'E2E credentials not set; skipping profile smoke test')

// Minimal UserProfile payload for rendering profile page
const minimalProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  email: 'engineer@example.com',
  first_name: 'Taro',
  last_name: 'Yamada',
  first_name_kana: 'タロウ',
  last_name_kana: 'ヤマダ',
  birthdate: '1990-01-01',
  gender: '男性',
  address: '東京都新宿区',
  phone_number: '090-0000-0000',
  education: '大学卒',
  nearest_station: '新宿',
  can_travel: 3,
  appeal_points: 'フロントエンドが得意です',
  role: 'engineer',
  certifications: [],
  language_skills: [],
  framework_skills: [],
  business_exps: [],
}

test.describe('Skill Sheet (Profile) Smoke', () => {
  test('login → open profile → temp save success toast', async ({ page }) => {
    // Stub profile GET
    await page.route('**/api/v1/profile', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(minimalProfile),
        })
      }
      return route.fallback()
    })

    // Stub profile temp-save POST
    await page.route('**/api/v1/profile/temp-save', route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'OK' }) })
      }
      return route.fallback()
    })

    // 1) Login via UI
    await uiLogin(page)

    // 2) Navigate to profile page
    await page.goto('/profile')
    await expect(page.getByTestId('profile-form-container')).toBeVisible()
    await expect(page.getByTestId('basic-info-card')).toBeVisible()

    // 3) Fill minimal fields using accessible labels
    await page.getByLabel('最終学歴').fill('大学院卒')
    await page.getByLabel('最寄駅').fill('代々木')
    // Radio group for 出張可否 → select 要相談
    const travelRadio = page.getByRole('radio', { name: '要相談' })
    if (await travelRadio.isVisible()) {
      await travelRadio.check()
    }

    // 4) Click 一時保存 and assert success
    const tempSaveResp = page.waitForResponse(resp => resp.url().includes('/api/v1/profile/temp-save') && resp.request().method() === 'POST')
    await page.getByRole('button', { name: '一時保存' }).click()
    const resp = await tempSaveResp
    expect(resp.ok()).toBeTruthy()
    await expect(page.getByTestId('toast-success')).toBeVisible()
  })
})
