# Sprint 5 Plan (2025-10-27 → 2025-11-07)

## Sprint Goal
Admin Expense Approval: approval queue/detail/approve-reject, CSV export (minimal), CI stability improvements.

## Scope & Tasks
- Frontend
  - Approval queue with filters; detail with receipt preview link
  - Approve/Reject actions; CSV export button
- Backend
  - Queue listing, detail fetch; approve/reject handlers
  - CSV export generation (minimal columns)
- Quality
  - E2E smoke: queue→detail→approve→CSV
  - Unit/contract tests; CI stability (flaky tests triage)
  - Docs: expense approval contracts updated

## Acceptance Criteria
- [ ] Approve/Reject updates consistent across list/detail
- [ ] CSV export works with correct encoding/columns
- [ ] E2E smoke green; CI stable for PRs

## Decision Log
- TBD

## References
- Contracts index: docs/spec/contracts/README.md
- Expense approval contract: docs/spec/contracts/expense_approval.md
- Expense contract: docs/spec/contracts/expense.md
- Common error spec: docs/spec/contracts/ERRORS.md

## Start Prompt
目的: 管理 経費承認（キュー/詳細/承認・却下/CSV最小）とCI安定化。
参照: 本計画、expense_approval契約、expense契約、ERRORS、Contracts index。
スコープ: 既存エンドポイント準拠でレスポンス整形とCSV追加、FEはキュー/詳細/操作、E2Eスモーク。
受入: AC準拠＋差分箇所のエラーエンベロープ準拠。
手順: 差分最小で実装、テスト安定化（flaky triage）。
