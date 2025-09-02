# Sprint 2 Plan (2025-09-15 → 2025-09-26)

## Sprint Goal
Engineer Expense flows: draft → edit → submit/cancel with single receipt upload via presigned URL; list/detail consistency.

## Scope & Tasks
- Frontend
  - ExpenseApplicationForm: CRUD + submit/cancel, validation, error UI
  - ReceiptUpload: presigned URL wiring, progress, replace/delete, retry
  - ExpenseHistoryView + list/detail alignment, pagination baseline
- Backend
  - Expense categories fetch, limit check service
  - Submit/Cancel handlers, DTOs, repository updates
  - Presigned URL issuance + receipt metadata persistence
- Quality
  - E2E smoke: expense draft→submit→cancel
  - Unit tests (validators/services), contract tests
  - Docs: API contracts (expense, storage) updated
  - Error envelope: adopt common format (docs/spec/contracts/ERRORS.md) for endpoints touched in this sprint

## Acceptance Criteria
- [ ] CRUD + submit/cancel work with validation
- [ ] Single receipt upload/replace/delete via presigned URL; retry supported
- [ ] List and detail show consistent status/history
- [ ] Server-side checks for limits; consistent error structure
- [ ] E2E smoke passes; docs updated
 - [ ] Error responses for updated endpoints follow common envelope (code/message/errors)

## References
- Contracts index: docs/spec/contracts/README.md
- Expense: docs/spec/contracts/expense.md
- Storage (presigned): docs/spec/contracts/storage.md
- Common error spec: docs/spec/contracts/ERRORS.md

## Decision Log
- TBD

## Start Prompt
目的: 経費ドラフト→編集→提出/取消と単一領収書アップロード（presigned）を安定化。
参照: 本計画、expense契約、storage契約、ERRORS、Contracts index。
スコープ: FEのフォーム/一覧・詳細整合、ReceiptUploadのpresignedフロー（generate→PUT→complete→delete）。BEは必要差分の堅牢化（カテゴリ/limit/submit/cancel/upload）。
受入: 本計画のAC＋エラーエンベロープ準拠（更新箇所）。
手順: 既存APIクライアントのcamel↔snake変換に準拠。処理順はFE→BE→E2E。差分のみエラーエンベロープを適用し破壊的変更は避ける。
