import { expect, Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

type Creds = { email: string; password: string }

export function hasCreds(): boolean {
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) return true
  const loginJsonPath = path.resolve(__dirname, '../../..', 'login.json')
  if (fs.existsSync(loginJsonPath)) {
    try {
      const raw = fs.readFileSync(loginJsonPath, 'utf-8')
      const json = JSON.parse(raw)
      return !!(json?.email && json?.password)
    } catch { /* ignore */ }
  }
  return false
}

function loadCreds(): Creds {
  // 優先: 環境変数 → ルートの login.json
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  if (email && password) return { email, password }

  const loginJsonPath = path.resolve(__dirname, '../../..', 'login.json')
  if (fs.existsSync(loginJsonPath)) {
    const raw = fs.readFileSync(loginJsonPath, 'utf-8')
    const json = JSON.parse(raw)
    if (json?.email && json?.password) return { email: json.email, password: json.password }
  }
  throw new Error('E2E credentials not found. Set E2E_EMAIL/E2E_PASSWORD or provide root login.json')
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
