# 開発モードでのログイン

## 概要

開発環境では`AUTH_SKIP_MODE=true`を設定することで、AWS Cognitoを使用せずに簡易的なログイン機能を利用できます。
メールアドレスによって自動的にロールが設定され、画面表示が切り替わります。

## 設定方法

### 環境変数の設定

`.env`ファイルまたは`docker-compose.yml`で以下を設定：

```env
# 開発モード設定
AUTH_SKIP_MODE=true
COGNITO_ENABLED=false  # Cognitoを無効化
```

## 利用可能なテストアカウント

開発モードでは、以下のメールアドレスでログインすると、それぞれ異なる権限でシステムを利用できます：

| メールアドレス | ロール | 権限レベル | 表示される画面 |
|--------------|--------|-----------|--------------|
| `super_admin@duesk.co.jp` | SuperAdmin | 最高権限 | 全機能・全画面 |
| `admin@duesk.co.jp` | Admin | 管理者 | 管理画面、ユーザー管理、設定 |
| `manager@duesk.co.jp` | Manager | マネージャー | プロジェクト管理、レポート閲覧 |
| `engineer_test@duesk.co.jp` | Engineer | エンジニア | 個人のプロジェクト、週報作成 |

### パスワード

開発モードでは**パスワードは不要**です。任意の文字列を入力するか、空欄でもログイン可能です。

## 使用方法

1. ブラウザで`http://localhost:3000`にアクセス
2. ログイン画面で上記のメールアドレスのいずれかを入力
3. パスワード欄は任意（空欄でも可）
4. ログインボタンをクリック

## 動作の仕組み

開発モード（`AUTH_SKIP_MODE=true`）では：

1. **ログイン時**: `CognitoAuthService.loginDevelopmentMode()`が呼ばれる
2. **メールアドレス判定**: 入力されたメールアドレスに基づいてロールを自動設定
3. **トークン生成**: 開発用の固定形式トークンを生成
4. **セッション作成**: DBに開発用セッションを作成
5. **画面表示**: ロールに応じた画面が表示される

### ミドルウェアでの処理

API呼び出し時は、`CognitoAuthMiddleware`が：
- トークンが`dev-access-token-`で始まる場合は開発モードと判定
- 対応するユーザー情報をコンテキストに設定
- 通常の認証フローと同じように処理を継続

## カスタムメールアドレスの使用

上記以外のメールアドレスでログインした場合：
- デフォルトで**Engineer**権限が付与されます
- メールアドレスの`@`より前の部分が名前として使用されます
- 例: `test@example.com` → 名前: "test", 権限: Engineer

## 注意事項

- **開発環境専用**: 本番環境では絶対に`AUTH_SKIP_MODE=true`を設定しないでください
- **セキュリティ**: 開発モードではパスワード検証が行われません
- **データ永続性**: 開発用ユーザーもDBに保存されます（削除時は手動で行う必要があります）

## トラブルシューティング

### ログインできない場合

1. 環境変数を確認：
```bash
docker-compose exec backend env | grep -E "AUTH_SKIP_MODE|COGNITO_ENABLED"
```

2. バックエンドログを確認：
```bash
docker-compose logs -f backend | grep "開発モード"
```

3. Dockerコンテナを再起動：
```bash
docker-compose restart backend
```

### 権限が正しく反映されない場合

1. ブラウザのCookieをクリア
2. ログアウトして再度ログイン
3. 別のブラウザまたはシークレットモードで試す

## 関連ドキュメント

- [認証設定ガイド](../05_architecture/authentication-setup.md)
- [環境変数設定](./.env.example)
- [ロール定義](../01_backend/model/role.md)