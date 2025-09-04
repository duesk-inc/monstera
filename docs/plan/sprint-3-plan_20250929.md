# Sprint 3 Plan (2025-09-29 → 2025-10-10)

## Sprint Goal
Engineer Project management minimal: list/detail/search/paging and lightweight CRUD with status.

## Scope & Tasks
- Frontend
  - ProjectList + filters + pagination; ProjectDetailDialog
  - Lightweight create/edit form with validation
  - RBAC view-only for non-owners if applicable
- Backend
  - Engineer Client lightweight list endpoint (Option A): GET /api/v1/engineer/clients?light=true (q/page/limit), read-only
  - List/search/paging endpoints with query utils
  - CRUD handlers/services/DTOs (lightweight fields)
  - Status transitions (simple finite states)
- Quality
  - Unit tests services/handlers; contract tests
  - E2E smoke: list→create→edit→detail
  - Docs: API contracts (project) updated
  - Error envelope: adopt common format (docs/spec/contracts/ERRORS.md) for new/updated endpoints

## Acceptance Criteria
- [ ] List/search/paging stable; detail consistent
- [ ] Create/edit validations applied; status updates valid
- [ ] E2E smoke green; docs updated
 - [ ] Engineer Client light list returns {items,total,page,limit,total_pages} and respects q/page/limit
 - [ ] Error responses for updated endpoints follow common envelope (code/message/errors)

## FE Notes
- Clients light API fallback/stub:
  - Env flag: set `NEXT_PUBLIC_USE_CLIENTS_STUB=true` to force stubbed list for local/dev.
  - Automatic fallback: when BE returns 404/501/500 on `GET /api/v1/engineer/clients?light=true`, FE serves a stub list to unblock UI flows.
  - Client module: `frontend/src/lib/api/clients.ts` (single source). Feature code should import `listEngineerClientsLight` and `LightClientItem` from this module.

## References
- Project contract: docs/spec/contracts/project.md
- Contracts index: docs/spec/contracts/README.md
- Common error spec: docs/spec/contracts/ERRORS.md
 - Backend backlog: docs/plan/sprint-3-backlog-be_20250929.md

## Decision Log
- TBD

## Start Prompt
目的: Project最小API（一覧/詳細/作成/更新）の実装とEngineer Client軽量一覧API追加。
参照: 本計画、backend backlog、project契約、ERRORS、Contracts index。
スコープ: ルータ/DTO/Repo/Service/Handler/Tests（BE-PRJ-001〜008）。FEはList/Detail/CRUD UIとRBAC。
受入: 本計画AC＋Client lightが{items,total,page,limit,total_pages}返却、q/page/limit対応。新規/更新エンドポイントはエラーエンベロープ準拠。
手順: BEはRouter→DTO→Service/Repo→Handler→Tests。FEはコンポーネント・API接続→テスト。契約差分時はversion更新・PR合意。
