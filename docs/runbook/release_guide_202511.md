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

### How to run Playwright smoke
Env vars (CI/Local):
- Frontend base URL: `E2E_BASE_URL` (default: `http://localhost:3000`)
- Engineer creds: `E2E_EMAIL`, `E2E_PASSWORD`
- Admin creds (optional but recommended): `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`

Commands (smoke by tag):
```bash
# Local
docker compose up -d
cd frontend && npm ci && npx playwright install --with-deps
E2E_BASE_URL=http://localhost:3000 \
E2E_EMAIL=engineer@example.com E2E_PASSWORD=***** \
E2E_ADMIN_EMAIL=admin@example.com E2E_ADMIN_PASSWORD=***** \
npx playwright test --grep "@smoke" --config=playwright.ci.config.ts --project=chromium
```

Artifacts (on failure):
- `frontend/test-results/` JSON, screenshots, videos, traces

## FAQ / Troubleshooting (Operators)

Q: Playwright スモークがローカルで失敗、CIでは成功する
- 確認: `E2E_BASE_URL` が `http://localhost:3000` か、環境に応じて正しい値か
- 確認: `docker compose ps` で Backend/Frontend/DB/MinIO が全て起動済みか
- 確認: Engineer用の `E2E_EMAIL`/`E2E_PASSWORD` が正しいか（SSO/Cognito等が有効な場合はCookie/Originに注意）
- 対処: UIモードで再現し画面遷移を確認 `cd frontend && npx playwright test --ui`
- 対処: ブラウザキャッシュ/`e2e/.auth` をクリアし、再度 `global-setup` による state 生成

Q: Admin系スモークが skip または 401 で失敗する
- 確認: CI/ローカルに `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` を設定したか
- 確認: `frontend/e2e/.auth/admin.json` が生成されているか（未設定時は空stateが作成され、spec側でskip）
- 対処: Secretsを追加後に再実行。skipの文言が出ている場合は設定不足が原因

Q: すぐに Login へリダイレクトされる（401系）
- 確認: `E2E_BASE_URL` とアプリのCookieドメインが一致しているか
- 確認: 時刻ズレ（時刻同期）がないか（JWT/Cookieの有効期限判定に影響）
- 対処: `global-setup` を再実行（`e2e/.auth` を削除）して storageState を再生成

Q: 404/ルート不一致で失敗する
- 確認: 画面パスが正しいか（例: Admin配下は `/admin/admin/...`）
- 確認: ルーティング変更があった場合、スモークの遷移先を最新パスへ更新

Q: Docker のヘルスチェック待機で詰まる/不安定
- 対処: `docker compose logs backend frontend` を確認
- 対処: ヘルスエンドポイント `/health` の実装/レスポンスを確認
- 対処: CIのリトライ（workflowsの`retries`設定）を確認

Q: アップロード系（MinIO）で失敗
- 確認: MinIOのバケット/CORS設定、署名URL、最大サイズ/MIME設定
- 対処: スモークでは小容量ダミーファイルとContent-Type/ステータスの最小確認に留める

Q: CSV エクスポートの文字化け/ヘッダ不一致
- 確認: テストはUTF-8(BOM)とヘッダ行を期待。実装のContent-Type/Content-Disposition/エンコーディングを確認
- 対処: まずはスタブでヘッダ整合性を担保。実装差異がある場合は別Issueで追跡

Q: 失敗時の成果物（スクショ/トレース/動画）を見たい
- 取得: CIアーティファクト `playwright-results` をダウンロード
- ローカル: `frontend/test-results` を VSCode の Playwright 拡張で開く

Q: 特定の1ケースだけ再実行したい
```bash
cd frontend
npx playwright test -g "Expense Smoke" --project=chromium
# もしくはファイル指定
npx playwright test e2e/expense.smoke.spec.ts --project=chromium
```

Q: タイムアウトが足りない/ネットワーク遅延がある
- 対処: `playwright.config.ts` の `expect.timeout`（例: 10000ms）、`navigationTimeout` を拡大
- 対処: 並列数はCIで1に固定（既定）。ローカルは `--workers=1` を指定可能

Q: storageState が壊れた/古い
- 対処: `rm -rf frontend/e2e/.auth && cd frontend && npx playwright test --config=playwright.ci.config.ts --project=chromium --list`（実行前にglobal-setupが走りstate再生成）

Q: どのテストがスモークとしてCIで走る？
- ルール: `**/*.smoke.spec.ts` が対象。加えて Engineer Weekly を別途実行
- 追加したい場合: ファイル名に `.smoke.spec.ts` を付与

参考:
- E2Eドキュメント: `docs/e2e-testing.md`
- CIワークフロー: `.github/workflows/e2e.yml`

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
