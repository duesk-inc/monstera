% フロント実装指針（Draft）

API クライアント
- 統一ファクトリ: `frontend/src/lib/api/factory/index.ts:1`
- 環境解決: `frontend/src/lib/api/config/env.ts:1`（`NEXT_PUBLIC_API_HOST` + `NEXT_PUBLIC_API_VERSION` 推奨、`NEXT_PUBLIC_API_URL` は後方互換）
- インターセプタ: 認証/ロギング/リトライを統一管理

状態/コンテキスト
- 認証状態: `AuthContext`（`frontend/src/context/AuthContext.tsx:1`）＋ `useAuth`
- 週報等は機能別 hooks を活用

エラーハンドリング/ロギング
- `DebugLogger` と API ファクトリのロギングを使用
- 本番は冗長ログを抑制

UI/レイアウト
- 共通レイアウトラッパ: `SharedLayoutWrapper`
- 役割別サイドバー: `EngineerSidebar` / `AdminSidebar`

TODO
- コンポーネント命名/配置/テスト規約の最終化
- アクセシビリティ/国際化の方針

