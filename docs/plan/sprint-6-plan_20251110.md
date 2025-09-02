# Sprint 6 Plan (2025-11-10 → 2025-11-21)

## Sprint Goal
Integrated E2E coverage, non-functional and UX polish, and code freeze prep for Nov release.

## Scope & Tasks
- Quality
  - Expand Playwright smoke to admin and expense flows
  - Add critical-path E2E for skill sheet, expense, weekly report, approval
  - Performance sanity checks; log/monitoring tweaks
- Frontend/Backend polish
  - Error UX consistency; loading states; accessibility passes
  - Minor performance fixes (memoization, query tuning)
- Release prep
  - Freeze branch; confirm migrations; finalize runbook

## Acceptance Criteria
- [ ] All smoke E2E green; critical-path E2E green
- [ ] P1=0; P2 triaged; pr-lint/CI green
- [ ] Runbook finalized; freeze by ~11/25

## Decision Log
- TBD

## References
- Release runbook: docs/runbook/release_guide_202511.md
- Contracts index: docs/spec/contracts/README.md
- Common error spec: docs/spec/contracts/ERRORS.md

## Start Prompt
目的: クリティカルパスE2E拡充、非機能/UX微修正、凍結準備。
参照: 本計画、Runbook、Contracts index、ERRORS。
スコープ: PlaywrightでEngineer/Adminの主要フロー（Skill Sheet/Expense/Weekly Report/Approval）。ログ/性能の健全化、アクセシビリティ。
受入: 全スモークE2E緑、P1=0、CI緑、Runbook最終化。
手順: E2EのテストID整備→テスト追加→凍結ブランチ作成→最終チェック。
