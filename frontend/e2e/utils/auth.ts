import { expect, Page } from '@playwright/test'
import { AUTH_COOKIES } from '@/constants/auth'

type Creds = { email: string; password: string }

export function hasCreds(): boolean {
  return Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD)
}

export function hasAdminCreds(): boolean {
  return Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD)
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

/**
 * Fake login by setting a dummy Cognito-like token cookie so middleware allows navigation.
 * Useful for smoke tests with route stubbing when real creds/backend are unavailable.
 */
export async function fakeLogin(page: Page) {
  // Minimal JWT-like format: header.payload.signature
  const dummyToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature'
  const url = new URL(page.url() || 'http://localhost:3000')
  await page.context().addCookies([
    {
      name: AUTH_COOKIES.ACCESS_TOKEN,
      value: dummyToken,
      url: 'http://localhost:3000',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])
}
