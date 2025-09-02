# Sprint 1 Plan (2025-09-01 → 2025-09-12)

## Sprint Goal
Deliver Engineer Skill Sheet with CRUD + draft autosave + validation + history, and establish Auth Guard baseline with Playwright smoke.

## Scope & Tasks
- Frontend
  - Skill Sheet Form: create/edit with draft autosave, required/limits validation
  - Suggests: category/technology suggestions (debounced remote fetch)
  - History view (latest-first), error UI (ValidationErrorAlert)
  - Routing & guards: protect engineer pages, redirect unauth
  - Unit tests (form logic, autosave), minimal integration tests
- Backend
  - API contracts: profile/history/category (DTOs) finalized
  - Handlers/Service/Repository for CRUD and history retrieval
  - Validation (server-side) aligned with FE rules
  - Unit tests with testify; basic error mapping
- Quality
  - Playwright skeleton: login → skill sheet save (smoke)
  - CI config: run unit tests + smoke on PR, pr-lint compliance
  - Docs: API spec updates, READMEs for setup

## Acceptance Criteria (Checklist)
- [ ] Skill Sheet CRUD works with draft autosave; reload restores draft
- [ ] Latest history entry fetches and displays correctly
- [ ] Required/upper-limit validations block submit with clear messages
- [ ] Category/technology suggests available and performant (debounce)
- [ ] Auth Guard prevents unauthorized access; redirects appropriately
- [ ] Server-side validation mirrors FE; consistent error structure
- [ ] Playwright smoke (login → save skill sheet) passes in CI
- [ ] Docs updated: API contract + setup notes

## Definition of Done
- Code reviewed; tests green; pr-lint passes; docs updated
- No P1 defects open for implemented scope

## Test Plan
- Unit: FE form reducers/hooks; BE service validators
- API: contract tests for profile/history/category endpoints
- E2E: Playwright smoke (headless) for login & save; add data-testid hooks where needed

## Deliverables
- Functional Skill Sheet feature (CRUD, draft, history, validation)
- CI pipeline runs unit + smoke tests
- Updated docs under `docs/` (plan/spec/setup)

## Out of Scope
- Expense flow, Project CRUD, Admin features, CSV, uploads

## Risk & Mitigation
- Suggest latency → debounce + caching
- Validation mismatch → shared constraints documented + examples
- Auth edge cases → explicit role matrix + negative tests

## Rollback Strategy
- Feature flag page access if instability found
- Revert PR via Git tag; DB safe (no destructive migrations in S1)

## References
- Contracts index: docs/spec/contracts/README.md
- Profile/Skill Sheet: docs/spec/contracts/profile.md
- Common error spec: docs/spec/contracts/ERRORS.md

## Start Prompt
目的: スキルシートCRUD＋一時保存＋履歴＋ガード、Playwrightスモークの確立。
参照: 本計画、profile契約、ERRORS、Contracts index。
スコープ: FEフォーム/状態/バリデーション、候補サジェスト、履歴、ガード。BEはCRUD/履歴取得、サーバーバリデ。QAはログイン→保存スモーク。
受入: 本計画のACに準拠。新規/更新箇所は共通エラーエンベロープ（code/message/errors）に合わせる（破壊的変更は不可）。
手順: FE→BE→E2Eの順で差分実装。Serenaのシンボル探索→位置指定編集を使用。契約差分が必要な場合はcontractのversionを更新してPRで合意。
