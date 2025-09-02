% Monstera Architecture (Draft)

- 構成: Next.js (App Router, TypeScript) + Go (Gin) + Postgres/Redis/MinIO + Cognito 認証
- 実行: `docker compose up -d` でフルスタック起動
- 責務分離: Web(API) と Batch は別バイナリ/別コンテナ（同一リポ内）

主要エントリ
- API エントリ: `backend/cmd/server/main.go:29`
- ルータ構築: `backend/cmd/server/main.go:531`
- 認証ミドルウェア（Cognito）初期化: `backend/cmd/server/main.go:586`
- ヘルスチェック: `backend/cmd/server/main.go:531`（`/health`, `/ready`）
- フロント共通レイアウト: `frontend/src/components/common/layout/SharedLayoutWrapper.tsx:1`
- 役割別サイドバー: `frontend/src/components/ui/EngineerSidebar.tsx:1`, `frontend/src/components/ui/AdminSidebar.tsx:1`

インフラ（ローカル）
- `docker-compose.yml:1`（Postgres/Redis/MinIO/API/Frontend）
- フロント→API の URL: `NEXT_PUBLIC_API_URL`（レガシー）/ 新方式は `NEXT_PUBLIC_API_HOST` + `NEXT_PUBLIC_API_VERSION`

運用方針（v0）
- Redis/キャッシュは任意（未接続でも動作）。性能課題が顕在化してから段階導入。
- バッチ（リマインド/アラート検知）は v0 では無効化。将来の要件確定後に再有効化。
- 帳票（PDF/Excel）は v0 では除外。CSV で代替し、帳票要件確定後に実装。

TODO
- 本番/ステージング構成図（LB, WAF, Secrets, CI/CD）
- 監視/ログ連携（Prometheus/Grafana, CloudWatch 等）
