# Project API Contract (Engineer Minimal)

version: 0.1.1
status: draft
owner: BE/FE shared

## Overview
Engineer-facing lightweight project management: list/detail/search/paging and simple CRUD for self-declared projects. This is a minimal v0 surface aligned with existing `backend/internal/model/project.go` while avoiding non-essential finance/assignment fields.

## Status Mapping (FE ↔︎ BE)
- FE 'draft' ↔︎ BE `proposal`
- FE 'active' ↔︎ BE `active`
- FE 'archived' ↔︎ BE `closed`
(BE `negotiation`/`lost` are not exposed to FE v0)

## Endpoints (Engineer)
- GET `/api/v1/projects`
  - Query (snake_case): `{ q?: string, status?: 'draft'|'active'|'archived', page?: number (>=1), limit?: number (1..100), sort_by?: 'created_at'|'status'|'project_name', sort_order?: 'asc'|'desc' }`
  - Resp: `ProjectListResponse`
- GET `/api/v1/projects/:id`
  - Resp: `Project`
- POST `/api/v1/projects`
  - Req: `ProjectCreate`
  - Resp: `Project`
- PUT `/api/v1/projects/:id`
  - Req: `ProjectUpdate`
  - Resp: `Project`

### Engineer Client (Option A: lightweight list, read-only)
- GET `/api/v1/engineer/clients?light=true`
  - Query (snake_case):
    - `q?: string` (company_name 部分一致)
    - `page?: number (>=1)`
    - `limit?: number (1..100)` (default 20)
  - Resp:
    - `{ items: { id: string, company_name: string }[], total: number, page: number, limit: number, total_pages: number }`
  - Purpose: dropdown population for `client_id` without exposing admin client management
  - Example:
    - Request: `GET /api/v1/engineer/clients?light=true&q=テック&page=1&limit=20`
    - Response:
      ```json
      {
        "items": [
          { "id": "cl_123", "company_name": "テック株式会社" }
        ],
        "total": 1,
        "page": 1,
        "limit": 20,
        "total_pages": 1
      }
      ```

## DTOs (minimal)
- Project
  - id: string
  - project_name: string
  - status: 'draft'|'active'|'archived'
  - start_date?: string (YYYY-MM-DD)
  - end_date?: string (YYYY-MM-DD|null)
  - description?: string (0..1000)
  - client_id: string
  - client_name?: string (read-only, denormalized)
  - created_at: string (ISO8601)
  - updated_at: string (ISO8601)
- ProjectCreate
  - project_name: string (1..200)
  - client_id: string (required)
  - status?: 'draft'|'active' (default 'draft')
  - start_date?: string (YYYY-MM-DD)
  - end_date?: string|null (YYYY-MM-DD)
  - description?: string (0..1000)
- ProjectUpdate
  - project_name?: string (1..200)
  - client_id?: string
  - status?: 'draft'|'active'|'archived' (FE→BE mapping適用)
  - start_date?: string (YYYY-MM-DD)
  - end_date?: string|null (YYYY-MM-DD)
  - description?: string (0..1000)
  - version?: number (optimistic lock; optional)
- ProjectListResponse
  - items: Project[]
  - total: number
  - page: number
  - limit: number
  - total_pages: number

## Validation
- project_name: required on create, length 1..200
- description: max 1000
- dates: ISO8601 (date), `start_date <= end_date` when both present
- status: only 'draft'|'active'|'archived'
- client_id: required on create; must reference existing client

## RBAC
- All endpoints require authenticated engineer role.
- Client light list is read-only and accessible to engineers.

## Errors
- 400 Bad Request (validation)
- 401 Unauthorized
- 403 Forbidden (role/ownership)
- 404 Not Found (project)
- 409 Conflict (version mismatch, when used)
- 500 Internal Server Error

## Acceptance Criteria

### List (GET /api/v1/projects)
- Returns paginated list with defaults: `page=1`, `limit=20`, `sort_by='created_at'`, `sort_order='desc'`.
- Filters: `q` applies to name/description; `status` filters by mapped status.
- Response conforms to `ProjectListResponse` and includes `total_pages`.

### Detail (GET /api/v1/projects/:id)
- Returns a single `Project` with `client_name` populated.
- 404 when not found or not visible to the user.

### Create (POST /api/v1/projects)
- Accepts `ProjectCreate` with required `project_name`, `client_id`.
- On success, returns created `Project` with mapped BE status.
- Validates date range and field lengths; returns 400 with field errors on violation.

### Update (PUT /api/v1/projects/:id)
- Accepts `ProjectUpdate`; updates only provided fields.
- Enforces status mapping and forbids edits if FE status is 'archived'.
- Returns updated `Project` or 404 if missing; 409 if version provided and mismatched.

### Engineer Client Light List (GET /api/v1/engineer/clients?light=true)
- Returns minimal list `{ id, company_name }` for selection.
- Paginates if underlying dataset is large (optional `page`, `limit`).

## Notes
- BE adapter maps FE status to `model.ProjectStatus` and persists.
- Finance-related fields (rates, working hours), codes, assignments are excluded from v0 engineer scope.
