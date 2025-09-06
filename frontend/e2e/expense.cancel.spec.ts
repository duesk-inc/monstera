import { test, expect } from '@playwright/test'
import { uiLogin } from './utils/auth'
test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E credentials not set; skipping expense cancel test')

function fmt(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

test.describe('Expense Cancel: submit → cancel', () => {
  test('submits an expense then cancels it via API and verifies UI', async ({ page }) => {
    await uiLogin(page)

    // 1) Create → Submit
    await page.goto('/expenses')
    await page.getByRole('button', { name: '新規作成' }).click()
    await page.waitForURL('**/expenses/new')

    const today = new Date()
    const memo = `E2E-Cancel Smoke ${Date.now().toString().slice(-6)}`

    await page.getByLabel(/申請日/).fill(fmt(today))
    await page.getByLabel(/カテゴリ/).click()
    const other = page.getByRole('option', { name: /その他/ })
    if (await other.count()) {
      await other.first().click()
    } else {
      await page.getByRole('option').first().click()
    }
    await page.getByLabel(/金額/).fill('3456')
    await page.getByLabel(/内容/).fill(memo)

    const submitRespPromise = page.waitForResponse((resp) => resp.request().method() === 'POST' && /\/api\/v1\/expenses\/[^/]+\/submit$/.test(resp.url()))
    await page.getByRole('button', { name: '作成して提出' }).click()
    const submitResp = await submitRespPromise
    expect(submitResp.ok()).toBeTruthy()
    const submitJson = await submitResp.json().catch(() => ({} as any))
    const submitData = (submitJson && (submitJson.data || submitJson.Data)) || submitJson
    const expenseId = submitData?.id || submitData?.Id
    expect(expenseId, 'submitted expense id').toBeTruthy()

    // 2) Verify submitted on detail
    await page.goto(`/expenses/${expenseId}`)
    await expect(page.getByRole('heading', { name: '経費申請詳細' })).toBeVisible()
    const submittedRaw = page.getByText(/submitted/i)
    const submittedJa = page.getByText(/申請済み|提出済み/)
    await expect(submittedRaw.or(submittedJa)).toBeVisible()

    // 3) Cancel via API (UI未実装のためAPI直叩き)
    const cancelResp = await page.request.post(`/api/v1/expenses/${expenseId}/cancel`, { data: {} })
    expect(cancelResp.ok()).toBeTruthy()

    // 4) Reload detail and verify status changed to cancelled
    await page.reload()
    const cancelledRaw = page.getByText(/cancelled/i)
    const cancelledJa = page.getByText(/キャンセル|取消/) // UI表記のゆらぎを許容
    await expect(cancelledRaw.or(cancelledJa)).toBeVisible()
  })
})
