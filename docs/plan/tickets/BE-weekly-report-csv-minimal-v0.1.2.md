# Ticket: BE – Weekly Report CSV (v0.1.2 minimal 8 columns)

Status: proposed
Owner: BE
Depends on: docs/spec/contracts/weekly_report.md (v0.1.2)

## Goal
Server generates Admin Weekly Report CSV matching contract v0.1.2 minimal columns with UTF-8, BOM, and Content-Disposition, without breaking existing consumers.

## Scope
- Add optional `schema=weekly_minimal` to `POST /api/v1/admin/engineers/weekly-reports/export`.
- When present, emit 8-column weekly CSV:
  1. エンジニア名
  2. メールアドレス
  3. 週開始日 (YYYY-MM-DD)
  4. 週終了日 (YYYY-MM-DD)
  5. ステータス (draft|submitted|approved|rejected|returned|not_submitted)
  6. 総勤務時間 (number)
  7. 管理者コメント (string)
  8. 提出日時 (YYYY-MM-DD HH:mm or empty)
- Preserve existing export behavior when `schema` is omitted.

## Deliverables
- Handler: accept `schema` and forward to service.
- Service: generate weekly-minimal CSV for month range; RFC 4180 escaping; filename `weekly_reports_YYYYMMDD.csv`.
- Tests: handler header assertions; service CSV row/header basic.
- Docs: weekly_report.md updated with `schema` param.

## Acceptance Criteria
- [ ] `schema=weekly_minimal` returns CSV with exactly the minimal 8 columns (additional columns not present).
- [ ] Content-Disposition filename present; Content-Type set to `text/csv`.
- [ ] Errors return JSON envelope (ERRORS.md).
- [ ] Non-breaking: default behavior unchanged when schema omitted.

## Notes
- FE currently prepends BOM on download; server-side BOM optional to avoid double BOM. If we add BOM at server, FE should skip adding.

