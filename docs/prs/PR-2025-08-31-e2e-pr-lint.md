# PR: E2E統一とPRルール導入の要約

## 目的
- E2EをPlaywrightに統一し、最小スモークを追加
- PR運用の徹底（テンプレ・チェックリスト・CIリント）

## 変更サマリ
- Playwright導入とスモーク2本（auth, weekly-report）
- 週報ページに安定セレクタ（data-testid）付与
- Cypressをcypress-legacyへ退避
- CI: e2e-playwright追加（backend起動含む）
- CI: pr-lint追加（PR本文チェック）
- PRガイドラインとPRテンプレートの追加
- E2E認証方式の統一（E2E_EMAIL/E2E_PASSWORD）

## 動作確認
- ローカル: docker compose up -d && npm run test:e2e
- CI: pr-lint/e2e-playwrightがグリーン（Secrets未設定時はE2Eスキップ）

## リスクとリカバリ
- 低: 既存Cypressはレガシー退避、機能影響なし。問題時はワークフロー無効化で回避可。
