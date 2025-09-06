import { chromium, request, type FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function ensureDir(p: string) {
  await fs.promises.mkdir(p, { recursive: true })
}

async function createStorageState(baseURL: string, email: string, password: string, statePath: string) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Try API login first (faster/stable). Fallback to UI login if it fails.
  let apiLoggedIn = false
  try {
    const api = await request.newContext({ baseURL })
    const resp = await api.post('/api/v1/auth/login', { data: { email, password } })
    if (!resp.ok()) throw new Error(`API login failed: ${resp.status()}`)
    // Transfer cookies from API context to browser context if any
    const cookies = await api.storageState()
    if (cookies?.cookies?.length) {
      await context.addCookies(cookies.cookies.map(c => ({ ...c, url: baseURL } as any)))
      apiLoggedIn = true
    }
  } catch {
    apiLoggedIn = false
  }

  if (!apiLoggedIn) {
    // UI login fallback
    await page.goto(new URL('/login', baseURL).toString())
    await page.getByTestId('login-form').waitFor()
    await page.getByTestId('email-input').fill(email)
    await page.getByTestId('password-input').fill(password)
    await page.getByTestId('login-button').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
  }

  await context.storageState({ path: statePath })
  await browser.close()
}

export default async function globalSetup(_config: FullConfig) {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'
  const authDir = path.resolve(__dirname, '.auth')
  await ensureDir(authDir)

  // Engineer
  const engEmail = process.env.E2E_EMAIL
  const engPass = process.env.E2E_PASSWORD
  {
    const engState = path.join(authDir, 'engineer.json')
    if (engEmail && engPass) {
      try {
        await createStorageState(baseURL, engEmail, engPass, engState)
      } catch (e) {
        console.warn('[global-setup] engineer storageState failed:', e)
      }
    } else {
      // Ensure empty state file exists to avoid file-not-found
      await fs.promises.writeFile(engState, JSON.stringify({ cookies: [], origins: [] }), 'utf8')
      console.warn('[global-setup] E2E_EMAIL/E2E_PASSWORD not set; wrote empty engineer state')
    }
  }

  // Admin (optional)
  const adminEmail = process.env.E2E_ADMIN_EMAIL
  const adminPass = process.env.E2E_ADMIN_PASSWORD
  {
    const adminState = path.join(authDir, 'admin.json')
    if (adminEmail && adminPass) {
      try {
        await createStorageState(baseURL, adminEmail, adminPass, adminState)
      } catch (e) {
        console.warn('[global-setup] admin storageState failed:', e)
      }
    } else {
      // Ensure empty state so specs can load and self-skip
      await fs.promises.writeFile(adminState, JSON.stringify({ cookies: [], origins: [] }), 'utf8')
      console.info('[global-setup] admin creds not provided; wrote empty admin state')
    }
  }
}
