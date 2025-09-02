# Contracts Index

Canonical API/DTO contracts to enable parallel FE/BE work. Update here first; reference commit SHAs in discussions.

## Modules
- Profile & Skill Sheet: profile.md
- Expense: expense.md
- Project: project.md
- Weekly Report: weekly_report.md
- Expense Approval: expense_approval.md
- Storage (S3/MinIO presigned): storage.md

## Guidelines
- DTOs: include types, required fields, max lengths
- Endpoints: method, path, params, responses, error codes
- Versioning: bump `version:` header within each file on breaking change

## Change Management
- What is a breaking change?
  - Field rename/removal, type change, required→optional/optional→required, response shape change, endpoint path/method change.
- Process
  1) Open a PR labeled `contract-change` referencing affected files and sprints.
  2) Update `version:` in each changed contract file (semver: major for breaking, minor for additive, patch for text fixes).
  3) Post summary to the team channel and add an entry to the sprint "Decision Log".
  4) If FE/BE mocks are impacted, include migration notes and a checklist.
- Error envelope
  - See `ERRORS.md` for the common error format used across services.
