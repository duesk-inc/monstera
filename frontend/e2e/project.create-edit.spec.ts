import { test, expect } from '@playwright/test'
import { uiLogin } from './utils/auth'

function tsSuffix() { return Date.now().toString().slice(-6) }

test.describe('Project: create → edit → detail', () => {
  test('creates a project, edits it, and verifies detail', async ({ page }) => {
    await uiLogin(page)

    // Go to list and then to create page
    await page.goto('/project')
    await expect(page.getByRole('heading', { name: '案件情報' })).toBeVisible()
    await page.getByRole('button', { name: /新規作成/ }).click()
    await page.waitForURL('**/project/new')
    await expect(page.getByRole('heading', { name: '案件の新規作成' })).toBeVisible()

    // Fill form
    const name = `E2E-Project ${tsSuffix()}`
    await page.getByLabel('案件名').fill(name)

    // Client select: open and pick first option if available
    await page.getByLabel('クライアント').click()
    const firstOption = page.getByRole('option').first()
    if (await firstOption.count() === 0) {
      test.skip(true, 'No client options available to create project')
    }
    await firstOption.click()

    // Optional fields
    await page.getByLabel('開始日').fill('2025-01-01')
    await page.getByLabel('終了日').fill('2025-12-31')
    await page.getByLabel('説明').fill('E2E create flow')

    // Intercept create API to capture id
    const createRespPromise = page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/v1\/projects$/.test(r.url()))
    await page.getByRole('button', { name: /作成/ }).click()
    const createResp = await createRespPromise
    expect(createResp.ok()).toBeTruthy()
    const createJson = await createResp.json().catch(() => ({} as any))
    const created = (createJson && (createJson.project || createJson.Project))
    const projectId: string | undefined = created?.id
    expect(projectId, 'created project id').toBeTruthy()

    // Should navigate to detail via onSuccess
    await page.waitForURL('**/project/detail**')
    await expect(page.getByText('案件詳細')).toBeVisible()
    await expect(page.getByRole('heading', { name })).toBeVisible()

    // Go to edit page and update name
    await page.goto(`/project/edit?id=${projectId}`)
    await expect(page.getByRole('heading', { name: '案件の編集' })).toBeVisible()
    const newName = `${name}-編集`
    await page.getByLabel('案件名').fill(newName)
    await page.getByLabel('説明').fill('E2E edit flow')

    const updateRespPromise = page.waitForResponse(r => r.request().method() === 'PUT' && new RegExp(`/api/v1/projects/${projectId}$`).test(r.url()))
    await page.getByRole('button', { name: /(保存|更新)/ }).click()
    const updateResp = await updateRespPromise
    expect(updateResp.ok()).toBeTruthy()

    // Verify on detail
    await page.waitForURL('**/project/detail**')
    await expect(page.getByRole('heading', { name: newName })).toBeVisible()
  })
})
