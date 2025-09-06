import { test, expect } from '@playwright/test'
import { uiLogin } from './utils/auth'
test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E credentials not set; skipping expense submit test')

function fmt(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

test.describe('Expense Submit: create → submit', () => {
  test('creates and submits expense via UI (create-and-submit)', async ({ page }) => {
    await uiLogin(page)

    // Go to new expense
    await page.goto('/expenses')
    await page.getByRole('button', { name: '新規作成' }).click()
    await page.waitForURL('**/expenses/new')

    // Fill form with valid data
    const today = new Date()
    const memo = `E2E-Submit Smoke ${Date.now().toString().slice(-6)}`

    await page.getByLabel(/申請日/).fill(fmt(today))

    await page.getByLabel(/カテゴリ/).click()
    const other = page.getByRole('option', { name: /その他/ })
    if (await other.count()) {
      await other.first().click()
    } else {
      await page.getByRole('option').first().click()
    }

    await page.getByLabel(/金額/).fill('2345')
    await page.getByLabel(/内容/).fill(memo)

    // Intercept the submit API (id needed for detail check)
    const submitRespPromise = page.waitForResponse((resp) => {
      return resp.request().method() === 'POST' && /\/api\/v1\/expenses\/[^/]+\/submit$/.test(resp.url())
    })

    // Create and submit in one action
    await page.getByRole('button', { name: '作成して提出' }).click()

    const submitResp = await submitRespPromise
    expect(submitResp.ok()).toBeTruthy()

    // Extract id from response
    const submitJson = await submitResp.json().catch(() => ({} as any))
    const data = (submitJson && (submitJson.data || submitJson.Data)) || submitJson
    const expenseId = data?.id || data?.Id
    expect(expenseId, 'submitted expense id').toBeTruthy()

    // Toast and redirect to list
    await expect(page.getByTestId('toast-success')).toBeVisible()
    await page.waitForURL('**/expenses')

    // Open detail to verify status is submitted (or Japanese label)
    await page.goto(`/expenses/${expenseId}`)
    await expect(page.getByRole('heading', { name: '経費申請詳細' })).toBeVisible()

    // Detail page prints raw status; accept either english or japanese label
    const submittedRaw = page.getByText(/submitted/i)
    const submittedJa = page.getByText(/申請済み|提出済み/)
    await expect(submittedRaw.or(submittedJa)).toBeVisible()

    // Additionally ensure edit button is not present after submit
    await expect(page.getByRole('button', { name: '編集' })).toHaveCount(0)
  })
})
