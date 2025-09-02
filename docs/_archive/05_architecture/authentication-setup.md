# 認証設定ガイド

## 環境管理

### 環境変数設定

Monsteraでは環境に応じた柔軟な認証設定が可能です。

#### 基本設定
```env
# 実行環境 (development, staging, production)
GO_ENV=development

# Cognito認証の有効/無効
COGNITO_ENABLED=false

# 認証スキップモード（開発環境用）
AUTH_SKIP_MODE=true

# Cookie設定
SECURE_COOKIES=false                      # HTTPS環境ではtrueに設定
COOKIE_SAME_SITE=lax                      # strict, lax, none から選択

# 開発用ユーザーのロール (1:SuperAdmin, 2:Admin, 3:Manager, 4:Engineer)
DEV_USER_ROLE=2                            # デフォルト: Admin
```

## 開発環境

開発環境では認証スキップモードを使用して、簡単に開発を進められるように設定されています。

### 設定方法

1. **docker-compose.yml**の環境変数:
```yaml
GO_ENV: ${GO_ENV:-development}                # 開発環境を明示
COGNITO_ENABLED: ${COGNITO_ENABLED:-false}    # Cognitoを無効化
AUTH_SKIP_MODE: ${AUTH_SKIP_MODE:-true}       # 認証スキップモードを有効化
DEV_USER_ROLE: ${DEV_USER_ROLE:-2}            # 開発用ユーザーのロール（Admin）
SECURE_COOKIES: ${SECURE_COOKIES:-false}      # HTTP環境用
COOKIE_SAME_SITE: ${COOKIE_SAME_SITE:-lax}    # CSRF対策
```

2. **backend/.env**の設定:
```env
GO_ENV=development     # 開発環境
COGNITO_ENABLED=false  # Cognito無効化
AUTH_SKIP_MODE=true    # 認証スキップモード有効
DEV_USER_ROLE=2        # Admin権限（カスタマイズ可能）
SECURE_COOKIES=false   # ローカル開発用
COOKIE_SAME_SITE=lax   # 開発環境での標準設定
```

### 動作仕様

認証スキップモードが有効な場合:
- すべてのAPIエンドポイントで自動的に開発用ユーザーとして認証される
- 開発用ユーザー情報:
  - Email: dev@duesk.co.jp
  - Role: DEV_USER_ROLEで設定した権限（デフォルト: Admin）
  - User ID: 1

### ローカルCognitoエミュレーター使用時

開発環境でCognito Localなどのエミュレーターを使用する場合:

```env
GO_ENV=development
COGNITO_ENABLED=true
AUTH_SKIP_MODE=false
COGNITO_ENDPOINT=http://localhost:9229  # エミュレーターのエンドポイント
COGNITO_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=local_pool_id
COGNITO_CLIENT_ID=local_client_id
COGNITO_CLIENT_SECRET=local_secret
```

**重要**: `COGNITO_ENDPOINT`は開発環境でのみ使用可能です。本番環境で設定するとエラーになります。

## ステージング環境

ステージング環境では本番に近い設定でAWS Cognitoを使用します。

### 設定方法

**backend/.env**の設定:
```env
GO_ENV=staging
COGNITO_ENABLED=true
AUTH_SKIP_MODE=false
COGNITO_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=<staging-user-pool-id>
COGNITO_CLIENT_ID=<staging-client-id>
COGNITO_CLIENT_SECRET=<staging-client-secret>
SECURE_COOKIES=true      # HTTPS環境
COOKIE_SAME_SITE=strict  # セキュリティ強化
```

## 本番環境

本番環境ではAWS Cognitoを使用した厳格な認証が必要です。

### 設定方法

**backend/.env**の設定:
```env
GO_ENV=production
COGNITO_ENABLED=true
AUTH_SKIP_MODE=false  # またはこの行を削除
COGNITO_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=<your-user-pool-id>
COGNITO_CLIENT_ID=<your-client-id>
COGNITO_CLIENT_SECRET=<your-client-secret>
SECURE_COOKIES=true      # 必須: HTTPS環境
COOKIE_SAME_SITE=strict  # 推奨: 最高レベルのセキュリティ
# COGNITO_ENDPOINT は設定禁止（設定するとエラー）
```

### Cookie設定の詳細

#### SameSite属性
- **strict**: 最も厳格。同一サイトからのリクエストのみCookieを送信
- **lax**: デフォルト。トップレベルナビゲーション時は送信を許可
- **none**: 全てのクロスサイトリクエストで送信（Secure必須）

#### Secure属性
- **true**: HTTPS環境で必須（本番環境）
- **false**: HTTP環境で使用（開発環境のみ）

### 環境検出

システムは`GO_ENV`環境変数で動作環境を判定します：

```go
// 開発環境
GO_ENV=development または GO_ENV=dev または 未設定

// ステージング環境  
GO_ENV=staging または GO_ENV=stage

// 本番環境
GO_ENV=production または GO_ENV=prod
```

### Cognito設定の詳細

詳細な設定方法については[Cognito設定ガイド](../04_development/cognito-app-client-setup.md)を参照してください。

## セキュリティ考慮事項

### エラーコード標準化

認証関連のエラーは標準化されたコード体系に従います：
- `AUTH_001`: 認証失敗
- `AUTH_002`: トークン期限切れ
- `AUTH_003`: 権限不足
- 詳細は[エラーコード標準](../06_standards/error-code-standard.md)を参照

### フロントエンド移行ガイド

廃止された関数からの移行：
```typescript
// 廃止された関数（削除済み）
// - setAuthState, getAuthState, clearAuthState
// - setTokens, getTokens, clearTokens  
// - setUser, getUser, clearUser
// - isAuthenticated, hasRole, hasAnyRole

// 現在利用可能な関数
import { convertRoleNumberToString, convertToLocalUser } from '@/utils/auth';
```

Cookie認証への完全移行により、トークン管理はバックエンドで行われます。

## トラブルシューティング

### 開発環境で認証エラーが発生する場合

1. 環境変数を確認:
   ```bash
   # 設定確認
   docker-compose exec backend env | grep -E "GO_ENV|COGNITO|AUTH_SKIP|COOKIE"
   ```

2. 認証スキップモードの設定:
   - `GO_ENV=development`に設定
   - `COGNITO_ENABLED=false`に設定
   - `AUTH_SKIP_MODE=true`に設定
   - `DEV_USER_ROLE`を適切な権限に設定（1-4）

3. Dockerコンテナを再起動:
   ```bash
   docker-compose restart backend
   ```

### 本番環境で認証エラーが発生する場合

1. 環境設定を確認:
   - `GO_ENV=production`に設定
   - `COGNITO_ENDPOINT`が設定されていないことを確認（重要）
   - `SECURE_COOKIES=true`に設定（HTTPS必須）

2. Cognito設定を確認:
   - User Pool IDとClient IDが正しいか
   - Client Secretが正しいか
   - リージョンが正しいか（ap-northeast-1）

3. Cookie設定を確認:
   - HTTPS環境で`SECURE_COOKIES=true`
   - 適切な`COOKIE_SAME_SITE`設定

4. ログを確認:
   ```bash
   docker logs monstera-backend -f --tail 100
   ```

### CORS/CSRF関連のエラー

1. Cookie SameSite属性を確認:
   - クロスドメインの場合: `COOKIE_SAME_SITE=none`（Secure必須）
   - 同一ドメインの場合: `COOKIE_SAME_SITE=lax`または`strict`

2. Secure属性を確認:
   - HTTPS環境: `SECURE_COOKIES=true`
   - HTTP環境（開発のみ）: `SECURE_COOKIES=false`

## 関連ドキュメント

- [Cognitoアプリケーションクライアント設定](../04_development/cognito-app-client-setup.md)
- [認証実装詳細](../01_backend/implementation/auth-implementation.md)
- [エラーコード標準](../06_standards/error-code-standard.md)
- [セキュリティ実装](../06_standards/security-implementation.md)