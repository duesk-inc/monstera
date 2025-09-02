# v0 November Release Plan (2025-09-01)

## Purpose
End-of-November release focusing on core Engineer features and minimal Admin workflows, with basic quality gates and documentation. Scope balances time-to-release with stability.

## Scope (In)
- Engineer
  - Skill Sheet: CRUD, draft autosave, history view, validation, suggests (category/tech)
  - Expense: create/edit/submit/cancel, category fetch, limit check, single receipt upload via presigned URL, list/detail consistency
  - Project: list/detail/search/paging, lightweight self-declared CRUD, status
- Admin
  - Weekly Report Management: list/detail/comment/approve-reject-return, monthly summary (basic), CSV export (minimal columns)
  - Expense Approval: approval queue/detail/approve-reject, CSV export (minimal)
- Common/Quality
  - Auth/Guard refinement, CI/Docker/Docs minimal, E2E smoke

## Out of Scope (v0)
- PDF/Excel reports, alert/unsubmitted batch, advanced multi-receipt S3, deep analytics dashboard, deep freee integration

## Assumptions
- Capacity: 1 person × 4h/day × 5d/week ≈ 20h/week, 9–11月で約260h
- Estimation coefficient: reuse+buffer = 0.864 (= 0.72 × 1.2)
- Effective total for this scope ≈ 233h, leaving ≈ 27h buffer
- Environment: Docker stack (Postgres, Redis, MinIO), NEXT_PUBLIC_API_URL / NEXT_SERVER_API_URL set

## High-level Estimates (effective hours)
- Engineer features: 138h × 0.864 ≈ 119h
- Admin Weekly Reports: 54h × 0.864 ≈ 47h
- Admin Expense Approval: 44h × 0.864 ≈ 38h
- Common/Quality: 34h × 0.864 ≈ 29h
- Total ≈ 233h (buffer ≈ 27h)

## Milestones (Sprints)
- Sprint 1 (09/01–09/12): Skill Sheet CRUD/draft/validation, Auth Guard baseline, Playwright skeleton
- Sprint 2 (09/15–09/26): Expense form + submit/cancel, single receipt via presigned URL, list/detail consistency
- Sprint 3 (09/29–10/10): Project mgmt list/detail/lightweight CRUD/search/paging, FE/BE contract
- Sprint 4 (10/13–10/24): Admin Weekly Reports (list/detail/approve/comment/CSV minimal), E2E smoke expand
- Sprint 5 (10/27–11/07): Admin Expense Approval (queue/detail/approve/CSV), CI stability
- Sprint 6 (11/10–11/21): Integrated E2E, non-functional & UX polish, code freeze ~11/25
- Release Window: 11/28–11/30 (with rollback plan)

## Acceptance Criteria (Release)
- Role-based access controls enforced on all pages/APIs in scope
- Skill Sheet/Expense/Project: CRUD flows stable, validation blocks invalid submissions, draft autosave works
- Single receipt upload via presigned URL: upload/replace/delete, retry on failure
- Admin Weekly Report & Expense Approval: list/detail consistent, approve/reject flows stable
- CSV export (weekly/expense) minimal columns, correct encoding and delimiter
- CI (pr-lint + tests) green, Playwright smoke passes, P1 bugs = 0
- Docs updated: API contracts, setup, release runbook

## Dependencies
- S3 (MinIO) bucket/policy, max size (e.g., 10MB), allowed MIME (PNG/JPG/PDF), presigned expiry
- Auth roles & guards mapping to UI and API
- DTO contracts for profile/history/category, expense limit checks, weekly report approval

## Risks & Mitigations
- Spec churn: 15-min kickoff per sprint to FIX spec; immediate docs update
- Rework on storage/auth: lock S3 and RBAC early (S1–S2)
- Buffer management: keep ≈27h reserved; adjust plan if burn > forecast

## Tracking & Ceremonies
- Weekly check-in: scope burn vs. capacity; adjust backlog
- Definition of Done: code + tests green + docs updated + review complete

