# Expense API Contract

version: 0.1.0
status: draft
owner: BE/FE shared

## Overview
Engineer expense CRUD, submit/cancel, list with filters, and single-receipt upload via presigned URL. Based on `backend/internal/handler/expense_handler.go` and `backend/internal/dto/expense_dto.go`. FE endpoints mirror `frontend/src/constants/expense.ts`.

## Endpoints (Engineer)
- GET `/api/v1/expenses`
  - Query: `ExpenseFilterRequest` (snake_case)
  - Resp: `ExpenseListResponse`
- GET `/api/v1/expenses/:id`
  - Resp: `ExpenseDetailResponse`
- POST `/api/v1/expenses`
  - Req: `CreateExpenseRequest`
  - Resp: `ExpenseResponse`
- PUT `/api/v1/expenses/:id`
  - Req: `UpdateExpenseRequest`
  - Resp: `ExpenseResponse`
- DELETE `/api/v1/expenses/:id`
  - Resp: 204 No Content
- POST `/api/v1/expenses/:id/submit`
  - Req: `{ comment?: string }`
  - Resp: `ExpenseResponse`
- POST `/api/v1/expenses/:id/cancel`
  - Req: `{ reason?: string }`
  - Resp: `ExpenseResponse`
- GET `/api/v1/expenses/summary`
  - Query: `{ year?: number, fiscal_year?: number, month?: number }`
  - Resp: `ExpenseSummaryResponse`

### Categories
- GET `/api/v1/expenses/categories`
  - Resp: `{ data: CategoryMasterResponse[] }`

### Single Receipt Upload (presigned)
- POST `/api/v1/expenses/upload-url`
  - Req: `GenerateUploadURLRequest`
  - Resp: `UploadURLResponse` { upload_url, s3_key, expires_at }
- POST `/api/v1/expenses/upload-complete`
  - Req: `CompleteUploadRequest`
  - Resp: `CompleteUploadResponse` { receipt_url, s3_key, uploaded_at }
- DELETE `/api/v1/expenses/upload`
  - Req: `DeleteUploadRequest`
  - Resp: 204 No Content

## Endpoints (Admin – Approval/CSV)
- GET `/api/v1/admin/engineers/expenses/pending`
  - Resp: `ExpenseListResponse`
- PUT `/api/v1/admin/engineers/expenses/:id/approve`
  - Req: `ApproveExpenseRequest`
  - Resp: `ExpenseResponse`
- PUT `/api/v1/admin/engineers/expenses/:id/reject`
  - Req: `RejectExpenseRequest`
  - Resp: `ExpenseResponse`
- GET `/api/v1/admin/engineers/expenses/check-limits`
  - Resp: `LimitsResponse`
- GET `/api/v1/admin/engineers/expenses/export`
  - Query: `ExpenseExportRequest` (filter + export options)
  - Resp: CSV (Content-Type: text/csv; charset=utf-8)

- GET `/api/v1/admin/expense-limits`
  - Resp: `ExpenseLimitSettingResponse[]`
- PUT `/api/v1/admin/expense-limits`
  - Req: `UpdateExpenseLimitRequest`
  - Resp: `ExpenseLimitSettingResponse`

## Core DTOs (excerpt)
- CreateExpenseRequest
  - title: string (1..255)
  - category: enum [transport, entertainment, supplies, books, seminar, other]
  - category_id?: string
  - amount: number (1..10_000_000)
  - expense_date: string (ISO8601)
  - description: string (10..1000)
  - receipt_url?: string; receipt_urls?: string[]
  - other_category?: string
- UpdateExpenseRequest: partial Create + `version: number`
- ExpenseResponse
  - id, user_id, title, category, amount, expense_date, status, description, receipt_url
  - approver_id?, approved_at?, paid_at?
  - created_at, updated_at
  - user?: UserSummary; approver?: UserSummary
- ExpenseDetailResponse: ExpenseResponse + approvals[], category_master?, monthly_summary?, current_limits?, can_edit/submit/cancel
- ExpenseListResponse: { items: ExpenseResponse[], total, page, limit, total_pages }
- ExpenseFilterRequest (query)
  - status?, category?, start_date?, end_date?, min_amount?, max_amount?
  - year?, fiscal_year?, month?
  - page, limit, sort_by ('expense_date'|'amount'|'created_at'), sort_order ('asc'|'desc')
- ApproveExpenseRequest: { comment?: string }
- RejectExpenseRequest: { reason?: string }
- GenerateUploadURLRequest: { file_name: string; file_size: number; content_type: string }
- UploadURLResponse: { upload_url: string; s3_key: string; expires_at: string }
- CompleteUploadRequest: { s3_key: string; file_name: string; file_size: number; content_type: string }
- CompleteUploadResponse: { receipt_url: string; s3_key: string; uploaded_at: string }
- DeleteUploadRequest: { s3_key: string }
- ExpenseLimitSettingResponse: { id, limit_type, amount, effective_from, created_by, created_at, updated_at }
- UpdateExpenseLimitRequest: { limit_type: 'monthly'|'yearly'; amount: number; effective_from?: string }

## Errors (common)
- 400 ValidationError: `{ errors: { field: message } }`
- 401 Unauthorized
- 403 Forbidden (role/ownership)
- 404 Not Found (expense)
- 409 Conflict (optimistic lock by version)
- 500 Internal Server Error

## Notes
- FE sends camelCase but converts to snake_case at API boundary.
- CSV responses set `Content-Disposition: attachment; filename="*.csv"` and UTF-8 with BOM when requested.

