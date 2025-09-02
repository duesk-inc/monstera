% 運用手順（Draft）

ローカル/開発
- 起動: `docker compose up -d`
- 停止: `docker compose down`
- Backend 単体: `cd backend && go run cmd/server/main.go`
- Frontend 単体: `cd frontend && npm run dev`

マイグレーション
- Backend コンテナの `entrypoint.sh` で起動時に実行（`start` モード）: `backend/entrypoint.sh:1`

ヘルスチェック
- API: `GET /health`, `GET /ready`（`backend/cmd/server/main.go:531`）

トラブルシュート（例）
- フロント→API の疎通: 環境変数（`NEXT_PUBLIC_*`）と CORS を確認
- Cognito 認証失敗: Cookie/トークン形式（Middleware ログ）とサーバログを確認

TODO
- 本番デプロイ手順（順序、ロールバック、DB 移行）
- アラート/監視（エラーレート、ジョブ失敗、DB 接続）

