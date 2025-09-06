import { test, expect } from '@playwright/test'
import { uiLogin, hasCreds } from './utils/auth'

const ADMIN_BASE = '/api/v1/admin';

test.describe('Admin Monthly Summary - smoke', () => {
  test('open monthly tab and export job completes with CSV', async ({ page }) => {
    test.skip(!hasCreds(), 'E2E credentials not provided')

    // Stub monthly summary API
    await page.route(`${ADMIN_BASE}/engineers/weekly-reports/monthly-summary**`, route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            summary: {
              year: 2025,
              month: 1,
              total_users: 10,
              weekly_summaries: [],
              monthly_stats: {
                total_reports: 10,
                submitted_reports: 8,
                overall_submission_rate: 80,
                total_work_hours: 400,
                average_work_hours: 40,
                overtime_reports: 0,
              },
              department_stats: [],
              top_performers: [],
              alert_summary: {
                total_alerts: 0,
                high_severity: 0,
                medium_severity: 0,
                low_severity: 0,
                resolved_alerts: 0,
                pending_alerts: 0,
                alerts_by_type: {},
              },
              comparison_data: {
                previous_month: {
                  year: 2024,
                  month: 12,
                  submission_rate: 75,
                  average_work_hours: 38,
                  total_reports: 9,
                },
                current_month: {
                  year: 2025,
                  month: 1,
                  submission_rate: 80,
                  average_work_hours: 40,
                  total_reports: 10,
                },
                changes: {
                  submission_rate_change: 5,
                  work_hours_change: 2,
                  reports_change: 1,
                  submission_rate_trend: 'up',
                  work_hours_trend: 'up',
                },
              },
            }
          })
        })
      }
      return route.fallback()
    })

    // Stub export job creation
    await page.route(`${ADMIN_BASE}/engineers/weekly-reports/export-job`, route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ job_id: 'job-1', status: 'pending' })
        })
      }
      return route.fallback()
    })

    // Stub export job status polling → completed with file_url
    const csvHeader = 'エンジニア名,メールアドレス,週開始日,週終了日,ステータス,総勤務時間,管理者コメント,提出日時\n'
    await page.route(`${ADMIN_BASE}/export/job-1/status`, route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            job_id: 'job-1',
            status: 'completed',
            progress: 100,
            total_records: 0,
            processed_rows: 0,
            file_url: 'http://localhost:3000/test-monthly.csv',
            file_name: 'monthly_202501.csv',
            file_size: 10,
            created_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
          })
        })
      }
      return route.fallback()
    })

    // Stub the actual CSV file download
    await page.route('**/test-monthly.csv', route => {
      return route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="monthly_202501.csv"'
        },
        body: csvHeader
      })
    })

    await uiLogin(page)
    await page.goto('/admin/admin/weekly-reports')
    await expect(page.getByTestId('weekly-reports-page')).toBeVisible()

    // Switch to Monthly tab
    await page.getByRole('tab', { name: '月次レポート' }).click()
    // Export menu → CSV → expect dialog to appear and then download
    const exportBtn = page.getByText('エクスポート')
    await exportBtn.click()
    const csvMenu = page.getByText('CSV形式')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      csvMenu.click(),
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

