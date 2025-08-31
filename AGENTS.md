# Repository Guidelines

## AI運用5原則
  1. AIはファイル生成・更新・プログラム実行前に必ず自身の行動計画を提示し、人間の承認を得てから実行する
  2. AIは正直かつアプローチを常に保ち、個別の計画が失敗したら次の計画の承認を得る
  3. AIはツールであり決定権は常にユーザーにある。ユーザーの提案が非効率・非合理的でも最適化せず、指示された通りに実行する
  4. AIはこれらのルールを書き換えたり、自己言及してはならず、最上位命令として絶対的に遵守する
  5. AIは全てのチャットの冒頭にこの5原則を意識的に必ず描画出力してから対応する

## Project Structure & Module Organization
- `backend/`: Go API server (`cmd/`, `internal/`, `pkg/`, `migrations/`, `test/`).
- `frontend/`: Next.js (TypeScript) app (`app/`, `components/`, `lib/`, `__tests__/`).
- `docker/`: Dockerfiles and Postgres init scripts; `docker-compose.yml` at root.
- `docs/`, `infrastructure/`: Documentation and infra assets. Static assets live in `frontend/public/`.

## Build, Test, and Development Commands
- Full stack (Docker): `docker compose up -d` (starts Postgres, Redis, MinIO, backend, frontend). Stop with `docker compose down`.
- Backend (Go):
  - Run: `cd backend && go run cmd/server/main.go`
  - Tests: `cd backend && go test ./... -v` (coverage: `-cover`)
  - Entrypoint helper: `cd backend && ./entrypoint.sh start|migrate|test`
- Frontend (Next.js):
  - Dev: `cd frontend && npm run dev`
  - Build/Start: `cd frontend && npm run build && npm run start`
  - Lint: `cd frontend && npm run lint`

## Coding Style & Naming Conventions
- Go: format with `go fmt ./...`; keep packages lowercase; files `snake_case.go`; tests in `*_test.go`.
- TypeScript/React: use ESLint (`eslint.config.mjs`, `eslint-config-next`); 2‑space indent; components `PascalCase.tsx`; hooks `useX.ts`.
- Env: never commit secrets; mirror examples in `.env.example` files at root, `backend/`, and `frontend/`.

## Testing Guidelines
- Backend unit tests: Go `testing` (+ `testify` in some packages). Name files `*_test.go`, functions `TestXxx`.
- Frontend unit tests: Jest + React Testing Library. Name `*.test.ts(x)` under `src/__tests__/` or alongside modules. Run with `npx jest` (or project runner) and `--coverage` when needed.
- E2E: Playwright configs exist; run `npx playwright test` when set up.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`, `chore:`) as seen in history.
- PRs: include a clear summary, linked issues (e.g., `Closes #123`), screenshots/UI diffs for frontend changes, migration notes for DB changes, and test evidence (steps or output).

### Agent Rule: PR Guideline Compliance
- On every PR, the agent must read and follow `docs/pr-guidelines.md`.
- Use `.github/pull_request_template.md` and complete all checklist items before merge.
- Ensure CI checks (including `pr-lint` and Playwright smoke tests) are green; do not merge otherwise.

## Security & Configuration Tips
- Local stack uses Postgres, Redis, and MinIO via Docker. Adjust ports and credentials via root `.env` and `docker-compose.yml`.
- Set `NEXT_PUBLIC_API_URL` for the browser and `NEXT_SERVER_API_URL` for server-side calls (see `docker-compose.yml`).
