# Release Guide (2025-11)

## Overview
Operational steps for the end-of-November v0 release. Includes pre-flight checks, deployment, smoke validation, and rollback.

## Dates
- Code Freeze: ~2025-11-25
- Release Window: 2025-11-28 – 2025-11-30

## Pre‑Release Checklist
- [ ] All CI checks green (unit + Playwright smoke + pr-lint)
- [ ] P1 bugs = 0, P2 triaged with owners
- [ ] API contracts and README updated
- [ ] Env vars set: `NEXT_PUBLIC_API_URL`, `NEXT_SERVER_API_URL`, backend `.env` (no secrets committed)
- [ ] Database migrations reviewed (none destructive for v0 scope)
- [ ] S3(MinIO) bucket/policy, size/MIME/expiry verified

## Deployment
1. Build images
   - Frontend: `cd frontend && npm ci && npm run build`
   - Backend: `cd backend && go build ./cmd/server`
2. Docker (full stack)
   - `docker compose up -d` (or rollout with your orchestrator)
3. DB migration
   - `cd backend && ./entrypoint.sh migrate` (idempotent; confirm status)

## Post‑Deploy Smoke
- [ ] Login works for engineer and admin roles
- [ ] Skill Sheet: open → edit → draft autosave → reload restores
- [ ] Expense: create draft → submit → cancel → list/detail consistency
- [ ] Project: list/search/paging stable
- [ ] Admin Weekly Report: list → detail → approve/reject → CSV export
- [ ] Admin Expense Approval: queue → detail → approve → CSV export
- [ ] Single receipt upload: presigned URL upload/replace/delete; retry works

## Monitoring & Logs
- Backend structured logs enabled; 5xx rate observed post-release
- Frontend console errors monitored; Sentry (if available) reviewed

## Rollback
1. Disable feature entry points (feature flag or route guard)
2. Roll back images to last stable tag
3. If migration involved, ensure backward compatibility (no destructive ops planned)
4. Communicate downtime/restore status to stakeholders

## Contacts & Ownership
- Tech owner: TBD
- Release manager: TBD
- On-call window: during release window

