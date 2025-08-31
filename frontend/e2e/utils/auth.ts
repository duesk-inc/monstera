import { expect, Page } from '@playwright/test'

type Creds = { email: string; password: string }

export function hasCreds(): boolean {
  return Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD)
}

function loadCreds(): Creds {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  if (email && password) return { email, password }
  throw new Error('E2E credentials not found. Set E2E_EMAIL/E2E_PASSWORD')
}

export async function uiLogin(page: Page) {
  const { email, password } = loadCreds()
  await page.goto('/login')

  await expect(page.getByTestId('login-form')).toBeVisible()
  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('login-button').click()

  // ダッシュボード到達をもって成功とする
  await page.waitForURL('**/dashboard')
  await expect(page.getByTestId('dashboard')).toBeVisible()
}

export async function uiLogout(page: Page) {
  // 実装に依存: ヘッダーやメニューからログアウト操作が必要
  // 暫定: /logout が存在するなら遷移、なければトップに戻る
  try {
    await page.goto('/logout')
  } catch {
    await page.goto('/')
  }
}
