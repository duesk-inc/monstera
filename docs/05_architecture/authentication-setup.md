# 認証設定ガイド

## 開発環境

開発環境では認証スキップモードを使用して、簡単に開発を進められるように設定されています。

### 設定方法

1. **docker-compose.yml**の環境変数:
```yaml
COGNITO_ENABLED: ${COGNITO_ENABLED:-false}  # Cognitoを無効化
AUTH_SKIP_MODE: ${AUTH_SKIP_MODE:-true}     # 認証スキップモードを有効化
```

2. **backend/.env**の設定:
```env
COGNITO_ENABLED=false  # Disable Cognito for development
AUTH_SKIP_MODE=true   # Enable authentication skip mode
```

### 動作仕様

認証スキップモードが有効な場合:
- すべてのAPIエンドポイントで自動的に開発用ユーザーとして認証される
- 開発用ユーザー情報:
  - Email: dev@duesk.co.jp
  - Role: admin
  - User ID: 1

## 本番環境

本番環境ではAWS Cognitoを使用した認証が必要です。

### 設定方法

**backend/.env**の設定:
```env
COGNITO_ENABLED=true
AUTH_SKIP_MODE=false  # またはこの行を削除
COGNITO_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=<your-user-pool-id>
COGNITO_CLIENT_ID=<your-client-id>
COGNITO_CLIENT_SECRET=<your-client-secret>
```

### Cognito設定の詳細

詳細な設定方法については[Cognito設定ガイド](/infrastructure/cognito/README.md)を参照してください。

## トラブルシューティング

### 開発環境で認証エラーが発生する場合

1. `COGNITO_ENABLED=false`に設定されているか確認
2. `AUTH_SKIP_MODE=true`に設定されているか確認
3. Dockerコンテナを再起動: `docker-compose restart backend`

### 本番環境で認証エラーが発生する場合

1. Cognito設定が正しいか確認
2. トークンの有効期限を確認
3. ログを確認: `docker logs monstera-backend`