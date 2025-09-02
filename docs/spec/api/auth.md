% Auth API（Draft）

ベース: `/api/v1/auth`

エンドポイント（実装参照: `backend/cmd/server/main.go:608`）
- `POST /register` 登録
- `POST /login` ログイン（レート制限あり）
- `POST /refresh` トークン更新
- `GET /me` 現在ユーザー（要認証）
- `POST /logout` ログアウト（要認証）

リクエスト/レスポンス例
- `POST /auth/login`
  - Request
    ```json
    { "email": "user@example.com", "password": "secret" }
    ```
  - Response 200
    ```json
    {
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "first_name": "太郎",
        "last_name": "山田",
        "role": 4,
        "phone_number": null
      },
      "access_token": "jwt-token",
      "refresh_token": "jwt-refresh",
      "message": "ログインに成功しました",
      "redirect_to": "/dashboard"
    }
    ```
  - Response 401/429（例）
    ```json
    { "error": "認証情報が無効です", "status": 401 }
    ```

- `POST /auth/refresh`
  - Request: Body なし（Cookie の Refresh を利用）
  - Response 200
    ```json
    { "access_token": "jwt-token", "refresh_token": "jwt-refresh", "user": { "id": "uuid", "email": "user@example.com", "role": 4 } }
    ```

- `GET /auth/me`
  - Response 200
    ```json
    { "user": { "id": "uuid", "email": "user@example.com", "first_name": "太郎", "last_name": "山田", "role": 4 } }
    ```

- `POST /auth/logout`
  - Response 200
    ```json
    { "message": "ログアウトしました" }
    ```

エラー/備考
- エラーフォーマット: 標準のエラーモデルを参照（`docs/spec/api/errors.md`）
- 429（ログイン試行過多）あり
- トークンは Cookie 利用前提。フロントは `AuthContext` と Middleware でガード

バリデーション
- email: 必須、メール形式
- password: 必須（長さ/複雑性は運用ポリシーに準拠）

TODO
- リクエスト/レスポンス例
- エラーコード/バリデーション
