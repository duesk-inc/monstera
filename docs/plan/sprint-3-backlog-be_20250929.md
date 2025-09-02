# Sprint 3 Backend Backlog (Projects + Engineer Client Light)

## Tickets

- BE-PRJ-001 Router
  - Define routes under `/api/v1`:
    - `GET /projects`
    - `GET /projects/:id`
    - `POST /projects`
    - `PUT /projects/:id`
    - `GET /engineer/clients?light=true` (q/page/limit)
  - RBAC: engineer-only
  - Deliverable: router wiring + middleware

- BE-PRJ-002 DTOs & Validators
  - ProjectCreate / ProjectUpdate (per contract)
  - Query params for list (q/status/page/limit/sort_by/sort_order)
  - Validation: name(1..200), description(<=1000), date range
  - Deliverable: dto package additions or request binders

- BE-PRJ-003 Handlers
  - Projects: list/detail/create/update
  - Engineer Client Light: list minimal clients
  - Error envelope: use common envelope for all new endpoints
  - Deliverable: handler methods + response mapping

- BE-PRJ-004 Service & Repository
  - Project: search/paging with query util; status mapping (FE↔BE)
  - Client light: id + company_name list with q/page/limit filters
  - Deliverable: service interfaces + repository queries

- BE-PRJ-005 Tests
  - Unit tests for service/handler (success/validation/error)
  - Contract tests vs docs/spec/contracts/project.md
  - Deliverable: go test passing; CI green

- BE-PRJ-006 Error Envelope Utility
  - Add utility to return `{ code, message, errors }` JSON
  - Adopt in new endpoints; existing ones are gradual (no breaking changes)
  - Deliverable: utils helper, used by new handlers

- BE-PRJ-007 RBAC Matrix Check
  - Ensure engineer access enforced; no admin endpoints exposed
  - Deliverable: middleware assertions in tests

- BE-PRJ-008 Docs Sync
  - Update contracts if minor adjustments; bump `version:`
  - Deliverable: PR with links to updated contracts

## Estimates (rough)
- Router: 2h
- DTOs/Validators: 4h
- Handlers: 8h
- Service/Repository: 10h
- Tests: 8h
- Error utility: 2h
- RBAC checks: 2h
- Docs sync: 2h
Total ≈ 38h

## References
- Project contract: docs/spec/contracts/project.md
- Common error spec: docs/spec/contracts/ERRORS.md
- Contracts index: docs/spec/contracts/README.md

