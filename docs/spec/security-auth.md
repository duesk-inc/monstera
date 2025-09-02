% 認証/権限（Draft）

- 認証: Cognito。ブラウザは Cookie（アクセストークン等）で保持。
- ガード: Next.js Middleware がトークン形式を軽検証し、未認証は `/login` に誘導。
- サーバ側: 認証必須の API は Cognito ミドルウェアで検証。

参照
- ミドルウェア: `frontend/src/middleware.ts:1`
- AuthContext: `frontend/src/context/AuthContext.tsx:1`
- useAuth フック: `frontend/src/hooks/useAuth.ts:1`
- サーバ ミドルウェア初期化: `backend/cmd/server/main.go:586`

ロール
- 数値ロール（例: 4=エンジニア）を UI でラベル化（例: `UserMenuSection.tsx`）。
- 単一ロール前提の実装（ActiveRole 切替なし）。

TODO
- ロール別可視/操作権限の明文化（各画面/各 API 単位）
- トークン期限切れ時の UX（サイレント更新/再ログイン）

