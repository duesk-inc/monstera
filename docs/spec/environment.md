% 環境/設定（Draft）

フロント（Next.js）
- 推奨: `NEXT_PUBLIC_API_HOST`, `NEXT_PUBLIC_API_VERSION`
- 後方互換: `NEXT_PUBLIC_API_URL`（移行警告あり）
- サーバ側 API 通信: `NEXT_SERVER_API_URL`（Docker では `http://backend:8080`）
- 参照: `frontend/src/lib/api/config/env.ts:1`, `docker-compose.yml:1`

バックエンド（Go）
- DB/Redis/MinIO/Cognito を環境変数で設定（`docker-compose.yml:1`）
- 起動エントリ: `backend/entrypoint.sh:1`

初期スコープ方針（v0）
- Redis は任意（接続失敗時も継続動作）。キャッシュ最適化はリリース後に検討。
- バッチ系（リマインド/アラート検知）は v0 では無効化（環境変数やルートで停止）。
- 帳票は CSV を標準。PDF/Excel は v0 対象外。

ローカル起動
- `docker compose up -d`
- 単体実行: Backend `cd backend && go run cmd/server/main.go` / Frontend `cd frontend && npm run dev`

TODO
- ステージング/本番の環境変数一覧とデフォルト値
- Secret 管理指針（.env 禁止事項/サンプルの整備）
