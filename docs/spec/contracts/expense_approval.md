# Expense Approval API Contract (Admin)

version: 0.1.0
status: draft
owner: BE/FE shared

## Endpoints
- GET `/api/v1/admin/engineers/expenses/pending`
- PUT `/api/v1/admin/engineers/expenses/:id/approve`
- PUT `/api/v1/admin/engineers/expenses/:id/reject`
- GET `/api/v1/admin/engineers/expenses/check-limits`
- GET `/api/v1/admin/engineers/expenses/export` (CSV)

## DTOs
- ApproveExpenseRequest: { comment?: string }
- RejectExpenseRequest: { reason?: string }
- Responses reuse `ExpenseResponse` and `ExpenseListResponse` from expense.md

