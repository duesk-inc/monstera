# E2E Testing (Playwright)

## 概要
本プロジェクトのE2Eは Playwright に統一します。Cypress はレガシー扱いとし、今後は更新しません。

## 前提
- ローカルスタックを起動: `docker compose up -d`
- フロントの依存: `cd frontend && npm ci`
- Playwrightブラウザ: `npm run test:e2e:install`
- 認証情報（Engineerロール）: 環境変数 `E2E_EMAIL`, `E2E_PASSWORD`
- 任意（Adminロール）: 環境変数 `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`
- 任意（ベースURL上書き）: 環境変数 `E2E_BASE_URL`（未設定時は `http://localhost:3000`）

## 実行
```bash
cd frontend
npm run test:e2e          # ヘッドレス実行
npm run test:e2e:ui       # UIモード
npm run test:e2e:headed   # headed + PWDEBUG
```

環境変数例（macOS/Linux）:
```bash
export E2E_EMAIL="engineer@example.com"
export E2E_PASSWORD="*****"
# Admin系も実行する場合
export E2E_ADMIN_EMAIL="admin@example.com"
export E2E_ADMIN_PASSWORD="*****"
export E2E_BASE_URL="http://localhost:3000"
```

スモークのみ実行（タグ運用）:
```bash
npx playwright test --grep "@smoke" --config=playwright.ci.config.ts --project=chromium
```

テストに `@smoke` を付与してスモーク対象を管理します（ファイル名ではなくタグで選別）。
例: `test('@smoke open weekly report page', async () => { ... })`

## 構成
- 設定: `frontend/playwright.config.ts`（ベースURLは `E2E_BASE_URL` を参照）
- CI設定: `frontend/playwright.ci.config.ts`
- テスト: `frontend/e2e/*.spec.ts`
- セットアップ: `frontend/e2e/global-setup.ts` / `global-teardown.ts`
- 共通ユーティリティ: `frontend/e2e/utils/`
- ログイン状態（storageState）:
  - Engineer: `frontend/e2e/.auth/engineer.json`
  - Admin: `frontend/e2e/.auth/admin.json`
  - `global-setup` 実行時にUIログインで生成（ENV未設定時は空stateを生成）

## CIについて
- GitHub Actions: `.github/workflows/e2e.yml`
- 実行内容: スモークテスト（`**/*.smoke.spec.ts`）＋ Engineer Weekly を追加実行
- Secrets: `E2E_EMAIL`, `E2E_PASSWORD`, 任意で `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`

## 注意事項
- セレクタは `getByRole`/`getByLabel` を優先。`data-testid` は不足時のみ最小追加
- アップロード系は軽量ダミーで検証（Content-Type/ステータスのみ確認）

## 補足
- Cypressの既存ファイルは `frontend/cypress-legacy/` に退避済みで、今後の更新は行いません。
