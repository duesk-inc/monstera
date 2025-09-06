# Weekly Report API Contract

version: 0.1.2
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

## CSV Export (Admin)

version: 0.1.2 (draft)

- Purpose: Minimal CSV export for admin weekly reports. Backward compatible with 0.1.0.

### Content and Encoding
- Encoding: UTF-8, BOM: required (adds EF BB BF at head)
- Delimiter: comma `,`
- Header row: present
- Line endings: `\n`
- Content-Disposition: `attachment; filename="weekly_reports_YYYYMMDD.csv"` (filename* UTF-8 も可)

### Minimal Columns (order MUST be preserved)
1. エンジニア名 (user_name)
2. メールアドレス (user_email)
3. 週開始日 (week_start / start_date, ISO `YYYY-MM-DD`)
4. 週終了日 (week_end / end_date, ISO `YYYY-MM-DD`)
5. ステータス (status, string enum: draft|submitted|approved|rejected|returned|not_submitted)
6. 総勤務時間 (total_work_hours, number)
7. 管理者コメント (manager_comment, string, may be empty)
8. 提出日時 (submitted_at, `YYYY-MM-DD HH:mm` or empty)

Notes:
- Additional columns MAY be added after these eight; consumers MUST tolerate extras.
- Dates in local time unless otherwise specified; server SHOULD be consistent.
- Values containing commas or quotes MUST be CSV-escaped per RFC 4180.

### Error Handling
- On error, server SHOULD respond JSON envelope per ERRORS.md, NOT CSV.
- Clients SHOULD detect `Content-Type` and parse JSON envelope `{code,message,errors}` for UI.

### Examples
Header line:
```
エンジニア名,メールアドレス,週開始日,週終了日,ステータス,総勤務時間,管理者コメント,提出日時
```

Row example:
```
山田太郎,taro@example.com,2025-01-06,2025-01-12,submitted,40,,2025-01-12 18:30
```

## RBAC
- Admin weekly report endpoints require one of roles: `super_admin`, `admin`, `manager`.
- Frontend should gate the admin UI accordingly; backend enforces via middleware.

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

## Server Parameters (CSV export)
- `month` (string, required): target month in `YYYY-MM`.
- `format` (string, required): `csv`.
- `schema` (string, optional): output schema switch. When `weekly_minimal`, server SHOULD emit the minimal 8-column weekly report CSV defined above. If omitted, server MAY emit a legacy/attendance-oriented CSV for backward compatibility.

Notes:
- Clients SHOULD tolerate additional columns after the first eight.
- On error, server returns JSON envelope, not CSV.

### Operational headers and env
- Response headers:
  - `X-CSV-Schema`: `weekly_minimal` or `legacy` (for observability)
  - `Deprecation: true` MAY be set when responding with legacy output
- Env toggle (server): `WEEKLY_CSV_DEFAULT_SCHEMA=legacy|weekly_minimal` controls the default when `schema` is omitted.
