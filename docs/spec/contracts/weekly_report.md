# Weekly Report API Contract

version: 0.1.0
status: draft
owner: BE/FE shared

## Overview
User weekly report CRUD + submit, and Admin moderation endpoints. Based on `backend/internal/routes/weekly_report_refactored_routes.go` and admin routes in `backend/internal/routes/admin_routes.go`.

## Endpoints (Engineer)
- GET `/api/v1/weekly-reports`
- GET `/api/v1/weekly-reports/:id`
- POST `/api/v1/weekly-reports`
- PUT `/api/v1/weekly-reports/:id`
- POST `/api/v1/weekly-reports/:id/submit`
- DELETE `/api/v1/weekly-reports/:id`

## Endpoints (Admin)
- GET `/api/v1/admin/engineers/weekly-reports`
- GET `/api/v1/admin/engineers/weekly-reports/:id`
- POST `/api/v1/admin/engineers/weekly-reports/:id/comment`
- PUT `/api/v1/admin/engineers/weekly-reports/:id/approve`
- PUT `/api/v1/admin/engineers/weekly-reports/:id/reject`
- PUT `/api/v1/admin/engineers/weekly-reports/:id/return`
- GET `/api/v1/admin/engineers/weekly-reports/monthly-attendance`
- GET `/api/v1/admin/engineers/weekly-reports/summary`
- POST `/api/v1/admin/engineers/weekly-reports/export`
- POST `/api/v1/admin/engineers/weekly-reports/export-job`
- GET `/api/v1/admin/export/:jobId/status`

## DTOs (high-level)
- WeeklyReport
  - id, user_id, week_start, week_end, status, created_at, updated_at
  - daily_records: DailyRecord[]
  - comments?: Comment[]
- DailyRecord
  - date, client_time_minutes, company_time_minutes, description
- Comment
  - id, author_id, body, created_at

## Errors
- 400/401/403/404/500 standard

