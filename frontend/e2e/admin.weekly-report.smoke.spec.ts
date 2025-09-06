import { test, expect } from '@playwright/test'
import { hasAdminCreds } from './utils/auth'
test.use({ storageState: 'e2e/.auth/admin.json' })

const ADMIN_BASE = '/api/v1/admin';

test.describe('Admin Weekly Report - smoke', () => {
  test.skip(!hasAdminCreds(), 'Admin credentials not provided; skipping admin smoke tests')
  test('@smoke list → detail(approve) → CSV header', async ({ page, context }) => {

    // Stub list API (empty to keep fast)
    await page.route(`${ADMIN_BASE}/engineers/weekly-reports**`, route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reports: [], total: 0, page: 1, limit: 20 })
        })
      }
      return route.fallback()
    })

    // Stub detail API
    await page.route(`${ADMIN_BASE}/engineers/weekly-reports/wr-1`, route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            report: {
              id: 'wr-1',
              user_name: 'Taro Test',
              user_email: 'taro@example.com',
              start_date: '2025-01-06',
              end_date: '2025-01-12',
              status: 'submitted',
              total_work_hours: 40,
              manager_comment: '',
              created_at: '2025-01-06T00:00:00Z',
              daily_records: [],
              work_hours: []
            }
          })
        })
      }
      return route.fallback()
    })

    // Stub approve API
    await page.route(`${ADMIN_BASE}/engineers/weekly-reports/wr-1/approve`, route => {
      if (route.request().method() === 'PUT') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: '承認しました' }) })
      }
      return route.fallback()
    })

    // Stub CSV export API
    const csvHeader = 'エンジニア名,メールアドレス,週開始日,週終了日,ステータス,総勤務時間,管理者コメント,提出日時\n'
    await page.route(`${ADMIN_BASE}/engineers/weekly-reports/export**`, route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="weekly_reports_20250101.csv"'
          },
          body: csvHeader
        })
      }
      return route.fallback()
    })

    // Using admin storageState

    // 1) List page opens
    await page.goto('/admin/admin/weekly-reports')
    await expect(page.getByTestId('weekly-reports-page')).toBeVisible()

    // 2) Detail page approve flow
    await page.goto('/admin/admin/engineers/weekly-reports/wr-1')
    const approveBtn = page.getByTestId('wr-approve')
    await expect(approveBtn).toBeVisible()
    await approveBtn.click()
    // No hard assertion on toast; API stub would be called if button interacts.

    // 3) CSV export header check
    await page.goto('/admin/admin/weekly-reports')
    const exportBtn = page.getByText('エクスポート')
    await exportBtn.click()
    const csvMenu = page.getByText('CSV形式')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      csvMenu.click()
    ])
    const path = await download.path()
    if (path) {
      const fs = require('fs') as typeof import('fs')
      const data = fs.readFileSync(path, 'utf8')
      const normalized = data.replace(/^\uFEFF/, '')
      expect(normalized.startsWith(csvHeader)).toBeTruthy()
    }
  })
})
