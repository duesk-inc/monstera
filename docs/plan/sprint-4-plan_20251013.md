# Sprint 4 Plan (2025-10-13 → 2025-10-24)

## Sprint Goal
Admin Weekly Report management: list/detail/comment/approve-reject-return, monthly summary (basic), CSV export (minimal columns).

## Scope & Tasks
- Frontend
  - Admin list with filters; detail view with comments
  - Approve/Reject/Return actions with confirmation dialogs
  - CSV export button (minimal columns)
- Backend
  - Admin endpoints for list/detail/approve/reject/return; comments
  - Monthly summary aggregation (basic)
  - CSV export generation (UTF-8, comma, header)
- Quality
  - E2E smoke: list→detail→approve→CSV
  - Unit tests + contract tests; CSV content tests
  - Docs: weekly report contracts updated

## Acceptance Criteria
- [ ] Approvals and comments persist, reflected in list/detail
- [ ] CSV export downloads with correct encoding/columns
- [ ] E2E smoke green; docs updated

## Frontend Completion Notes (Admin Weekly Report)
Date: 2025-10-24

Scope delivered (FE):
- Admin UI list/detail implemented with filters (search/status/date), pagination, and navigation.
- Comment post/edit from list dialog and detail side panel; invalidate list/detail caches after actions.
- Approve/Reject/Return wired; UI enforces comment required for Reject/Return; optional for Approve.
- CSV export integrated: synchronous download, respects Content-Disposition filename, UTF-8 with BOM.
- RBAC: Admin/Manager only (frontend gate + backend middleware).
- Error UI: Consumes common error envelope {code,message,errors} and shows unified toasts.

Routes used (per weekly_report v0.1.2):
- List: GET /api/v1/admin/engineers/weekly-reports (status, date_from/date_to, search, page, limit)
- Detail: GET /api/v1/admin/engineers/weekly-reports/:id
- Comment: POST /api/v1/admin/engineers/weekly-reports/:id/comment
- Approve/Reject/Return: PUT /api/v1/admin/engineers/weekly-reports/:id/(approve|reject|return)
- CSV: POST /api/v1/admin/engineers/weekly-reports/export?month=YYYY-MM&format=csv

CSV behavior (FE):
- Encoding: UTF-8, BOM added client-side when applicable.
- Download: Content-Disposition respected; filename parsed (RFC 5987 filename* or filename).
- Columns: Detail page provides single-report CSV with the contract minimal 8 columns (client-side generation). List bulk export calls server endpoint, which currently emits monthly attendance schema; FE displays result as-is. Contract v0.1.2 minimal 8 columns for admin weekly reports remains a backend follow-up.

Tests (FE):
- List CSV export triggers API (unit/integration present).
- Detail page error UI validates ERRORs envelope handling for actions.

Known deviations / follow-ups:
- Backend CSV columns: Server-side export currently outputs monthly attendance columns and not the weekly-report minimal 8 columns. FE ensures encoding/BOM/download behavior. Action: Align backend CSV columns with v0.1.2 or version contract accordingly in a backend PR.
- Route alias: Existing links to /admin/engineers/weekly-reports are preserved via redirect to /admin/weekly-reports (query string retained).

Conclusion:
- Frontend scope for Sprint 4 (Admin Weekly Report management) is completed. CSV encoding and download behavior meet the contract; column schema alignment is pending on the backend side.

## Decision Log
- 2025-10-14: CSV契約をv0.1.2に更新（最小8列・UTF-8+BOM・Content-Disposition）。FEは対応実装、E2Eスモーク追加。
- 2025-10-14: RBACをAdmin/Manager許可に統一（FE/BE）。BEはCognitoAuthMiddleware.AdminRequiredでmanager許可を追加。
- 2025-10-14: CSVエクスポートAPIは暫定的にmonth（YYYY-MM）クエリに追従。将来的にdate_from/date_to対応を契約検討。

## References
- Contracts index: docs/spec/contracts/README.md
- Weekly report contract: docs/spec/contracts/weekly_report.md
- Common error spec: docs/spec/contracts/ERRORS.md

## Start Prompt
目的: 管理 週報管理（一覧/詳細/コメント/承認系/CSV最小）を安定化。
参照: 本計画、weekly_report契約、ERRORS、Contracts index。
スコープ: 既存ハンドラ強化、CSV列最小の契約合わせ、フロントの一覧/詳細/操作UI整備。
受入: 本計画AC＋CSVが正しいエンコーディング/列。差分はエラーエンベロープ準拠。
手順: 既存ルートを尊重し差分実装。E2Eスモーク（list→detail→approve→CSV）。
