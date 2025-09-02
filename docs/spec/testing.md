% テスト方針（Draft）

バックエンド（Go）
- ユニット/ハンドラテスト: `backend/internal/.../*_test.go`
- 実行: `cd backend && go test ./... -v`

フロント（Next.js）
- 単体: Jest + RTL（`frontend/src/__tests__/` 他）
- 実行: `cd frontend && npm run test`

E2E
- Playwright 設定あり（必要時に有効化）

クリティカルシナリオ
- 認証（ログイン/ログアウト/状態復元）
- 週報（初期化→編集→下書き→提出）
- プロフィール保存
- 休暇申請/経費申請の作成/一覧/詳細

TODO
- カバレッジの閾値と CI 連携
- モック/スタブの標準化（Cognito/外部 API）

