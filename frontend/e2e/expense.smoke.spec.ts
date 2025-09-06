import { test, expect } from '@playwright/test'
import { uiLogin } from './utils/auth'
test.use({ storageState: 'e2e/.auth/engineer.json' })
// Skip when E2E creds are not provided (CI may set secrets)
test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E credentials not set; skipping expense smoke test')

// Utility: format date to yyyy-MM-dd
function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

test.describe('Expense Smoke: login → draft create', () => {
  test('@smoke creates a draft expense via UI', async ({ page }) => {
    // 1) Login via UI
    await uiLogin(page)

    // 2) Go to expenses list and click "新規作成"
    await page.goto('/expenses')
    await expect(page.getByRole('heading', { name: '経費申請一覧' })).toBeVisible()
    await page.getByRole('button', { name: '新規作成' }).click()

    // Ensure navigated to new form
    await page.waitForURL('**/expenses/new')
    await expect(page.getByRole('heading', { name: '経費申請の新規作成' })).toBeVisible()

    // 3) Fill form (use labels; avoid CSS dependency)
    const today = new Date()
    const uniqueSuffix = Date.now().toString().slice(-6)
    const memo = `E2E-Expense Smoke ${uniqueSuffix}`

    // 日付（MUI DatePicker text field）: ラベルは「申請日」
    await page.getByLabel(/申請日/).fill(formatDate(today))

    // カテゴリ: try to pick 「その他」; fallback to first option
    await page.getByLabel(/カテゴリ/).click()
    const otherOption = page.getByRole('option', { name: /その他/ })
    if (await otherOption.count()) {
      await otherOption.first().click()
    } else {
      await page.getByRole('option').first().click()
    }

    // 金額
    await page.getByLabel(/金額/).fill('1234')

    // 内容
    await page.getByLabel(/内容/).fill(memo)

    // 4) Save as draft
    // Wait for create API and success toast + redirect back to list
    const createRespPromise = page.waitForResponse((resp) => {
      const url = resp.url()
      return resp.request().method() === 'POST' && /\/api\/v1\/expenses(\?|$)/.test(url)
    })
    await page.getByRole('button', { name: '下書き保存' }).click()

    const createResp = await createRespPromise
    expect(createResp.ok()).toBeTruthy()

    await expect(page.getByTestId('toast-success')).toBeVisible()
    await page.waitForURL('**/expenses')
    await expect(page.getByRole('heading', { name: '経費申請一覧' })).toBeVisible()

    // 5) Verify a draft row is present (edit button visible on some row)
    // We don’t rely on ordering; assert at least one draft-edit action is available
    // (Edit button only appears for draft rows per component logic)
    const anyEdit = page.getByRole('button', { name: /編集/ })
    await expect(anyEdit.first()).toBeVisible()
  })
})
