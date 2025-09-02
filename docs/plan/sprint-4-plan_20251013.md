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

## Decision Log
- TBD

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
