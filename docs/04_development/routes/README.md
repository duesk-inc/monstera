# Backend Routes Organization

This document describes how API routes are organized and registered in the backend after modularization.

## Summary

- Per‑feature routes are defined under `backend/internal/routes/` as small, stateless setup functions (e.g. `SetupExpenseRoutes`, `SetupProfileRoutes`).
- Complex domains that require multiple middlewares and cross‑cutting policies (e.g. Notifications) use a struct‑based registrar (e.g. `NotificationRoutes`) to register a larger set of routes cohesively.
- `backend/cmd/server/main.go` wires services/handlers and calls the setup functions (or the struct registrar) to register routes on `router` or `api := router.Group("/api/v1")`.

## Current Feature Modules

- Engineer
  - File: `backend/internal/routes/engineer_routes.go`
  - API: `SetupEngineerRoutes(api, logger, authRequired, projectHandler, clientHandler)`
  - Registers: `/api/v1/projects`, `/api/v1/engineer/clients`

- Auth
  - File: `backend/internal/routes/auth_routes.go`
  - API: `SetupAuthRoutes(api, logger, rateLimiter, authRequired, authHandler)`
  - Registers: `/api/v1/auth/*`

- Profile
  - File: `backend/internal/routes/profile_routes.go`
  - API: `SetupProfileRoutes(api, authRequired, profileHandler)`

- Skill Sheet
  - File: `backend/internal/routes/skill_sheet_routes.go`
  - API: `SetupSkillSheetRoutes(api, authRequired, skillSheetHandler)`

- Expense
  - File: `backend/internal/routes/expense_routes.go`
  - API: `SetupExpenseRoutes(api, authRequired, expenseHandler)`

- Weekly Reports
  - File: `backend/internal/routes/weekly_report_routes.go`
  - API: `SetupWeeklyReportRoutes(api, authRequired, weeklyReportHandler)`

- Leave
  - File: `backend/internal/routes/leave_routes.go`
  - API: `SetupLeaveRoutes(api, authRequired, leaveHandler)`

- Users
  - File: `backend/internal/routes/user_routes.go`
  - API: `SetupUserRoutes(api, authRequired, userRoleHandler)`

- Work History
  - File: `backend/internal/routes/work_history_routes.go`
  - API: `SetupWorkHistoryRoutes(api, authRequired, workHistoryHandler)`

- Notifications (struct‑based)
  - File: `backend/internal/routes/notification_routes.go`
  - API (struct):
    - `NewNotificationRoutes(notificationHandler, cognitoAuthMW, weeklyReportAuthMW, logger)`
    - `(*NotificationRoutes).SetupRoutes(router)`
  - Also provides lightweight helpers:
    - `SetupNotificationRoutes(api, authRequired, handler)`
    - `SetupAdminNotificationRoutes(api, authRequired, handler)`

## Wiring in main.go

- The server bootstrap remains in `backend/cmd/server/main.go`. After creating handlers and middlewares, call per‑feature setup functions or the struct registrar.

Examples:

```go
// Per-feature (stateless) registration
routes.SetupExpenseRoutes(api, authMiddlewareFunc, expenseHandler)

// Struct-based registration for complex domains
weeklyReportAuthMiddleware := middleware.NewWeeklyReportAuthMiddleware(
    logger, *reportRepo, weeklyReportRefactoredRepo, userRepo, departmentRepo, cognitoMiddleware,
)
notificationRoutes := routes.NewNotificationRoutes(notificationHandler, cognitoMiddleware, weeklyReportAuthMiddleware, logger)
notificationRoutes.SetupRoutes(router)
```

## API Matrix (Endpoints / Methods / Auth)

- Auth `/api/v1/auth`
  - POST `/register` — Public
  - POST `/login` — Public (rate limited)
  - POST `/refresh` — Public (uses secure cookie)
  - GET `/me` — Auth required
  - POST `/logout` — Auth required

- Profile `/api/v1/profile`
  - GET `` — Auth required
  - GET `/with-work-history` — Auth required
  - POST `` — Auth required (save)
  - POST `/temp-save` — Auth required (draft)
  - GET `/history` — Auth required
  - GET `/history/latest` — Auth required
  - GET `/common-certifications` — Auth required
  - GET `/technology-categories` — Auth required

- Skill Sheet `/api/v1/skill-sheet`
  - GET `` — Auth required
  - PUT `` — Auth required (save)
  - POST `/temp-save` — Auth required (draft)

- Expenses `/api/v1/expenses`
  - POST `` — Auth required (create)
  - GET `/categories` — Auth required
  - GET `` — Auth required (list)
  - GET `/:id` — Auth required (detail)
  - PUT `/:id` — Auth required (update)
  - DELETE `/:id` — Auth required (delete)
  - POST `/:id/submit` — Auth required
  - POST `/:id/cancel` — Auth required
  - POST `/upload-url` — Auth required
  - POST `/upload-complete` — Auth required
  - DELETE `/upload` — Auth required
  - GET `/check-limits` — Auth required
  - GET `/summary` — Auth required
  - GET `/export` — Auth required (CSV export)

- Weekly Reports `/api/v1/weekly-reports`
  - GET `` — Auth required (list)
  - GET `/by-date-range` — Auth required
  - GET `/:id` — Auth required (detail)
  - POST `` — Auth required (create)
  - PUT `/:id` — Auth required (update)
  - DELETE `/:id` — Auth required (delete)
  - POST `/:id/submit` — Auth required
  - POST `/:id/copy` — Auth required
  - POST `/draft` — Auth required
  - POST `/submit` — Auth required
  - GET `/default-settings` — Auth required
  - POST `/default-settings` — Auth required

- Leave `/api/v1/leave`
  - GET `/types` — Auth required
  - GET `/balances` — Auth required
  - GET `/requests` — Auth required
  - POST `/requests` — Auth required
  - GET `/holidays` — Auth required

- Users `/api/v1/users`
  - PUT `/default-role` — Auth required

- Work History `/api/v1/work-history`
  - GET `` — Auth required (list)
  - GET `/:id` — Auth required (detail)
  - POST `` — Auth required (create)
  - PUT `/:id` — Auth required (update)
  - DELETE `/:id` — Auth required (delete)
  - GET `/search` — Auth required
  - GET `/summary` — Auth required
  - GET `/export` — Auth required
  - GET `/template` — Auth required
  - GET `/technology-suggestions` — Auth required
  - GET `/popular-technologies` — Auth required
  - GET `/technology-categories` — Auth required

- Engineer `/api/v1/projects`, `/api/v1/engineer/clients`
  - Projects (Engineer role required): GET `` / `/:id`, POST `` , PUT `/:id`
  - Clients light list: GET `/api/v1/engineer/clients?light=true` — Auth + Engineer role (requires `light=true`)

- Notifications (struct‑based registrar)
  - User `/api/v1/notifications` — Auth required
    - GET `` (list), GET `/unread`, GET `/unread-count`, GET `/:id`,
      PUT `/:id/read`, PUT `/read`, PUT `/read-all`, GET `/settings`, PUT `/settings`
  - Admin `/api/v1/admin/notifications` — Admin required
    - GET `` (advanced list), POST `` (create), GET `/:id`, PUT `/:id`, DELETE `/:id`,
      GET `/users/:user_id` (maps to recipient filter)
  - Stats `/api/v1/admin/notifications/stats` — Admin required
    - GET `` (stats), GET `/period?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
  - Weekly Report Reminders `/api/v1/weekly-reports/notifications/reminders` — Admin/Manager
    - POST `/single`, POST `/bulk`

## Choosing Between Lightweight vs. Struct-Based

- Use lightweight `SetupXxxRoutes(...)` when:
  - Routes are scoped to a single domain and require only a common `authRequired` middleware.
  - There are no cross‑domain guards or role matrices beyond standard auth.
  - You want minimal coupling and simple test points.

- Use struct‑based registrar when:
  - The feature spans user/admin/manager domains with different access rules.
  - Multiple middlewares are needed (e.g. Cognito auth + WeeklyReport role checks + rate limiting).
  - You need cohesive configuration/state (logger, shared guards) and want to avoid scattered registration.

## Notes & Conventions

- Keep route registration idempotent (avoid duplicate registrations); group per base path under `api := router.Group("/api/v1")`.
- Restrict setup files to route binding only; keep business logic in handlers/services.
- Prefer explicit handler injection from `main.go` to keep testability and avoid hidden dependencies.
