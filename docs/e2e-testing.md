# E2E Testing (Playwright)

## 概要
本プロジェクトのE2Eは Playwright に統一します。Cypress はレガシー扱いとし、今後は更新しません。

## 前提
- ローカルスタックを起動: `docker compose up -d`
- フロントの依存: `cd frontend && npm i`
- Playwrightブラウザ: `npm run test:e2e:install`
- 認証情報: いずれかを用意
  - ルート`login.json`に`{"email": "...", "password": "..."}`
  - 環境変数 `E2E_EMAIL`, `E2E_PASSWORD`

## 実行
```bash
cd frontend
npm run test:e2e          # ヘッドレス実行
npm run test:e2e:ui       # UIモード
npm run test:e2e:headed   # headed + PWDEBUG
```

## 構成
- 設定: `frontend/playwright.config.ts`
- テスト: `frontend/e2e/*.spec.ts`
- セットアップ: `frontend/e2e/global-setup.ts` / `global-teardown.ts`
- 共通ユーティリティ: `frontend/e2e/utils/`

## 補足
- Cypressの既存ファイルは `frontend/cypress/` に残存しますが、今後の更新は行いません。

