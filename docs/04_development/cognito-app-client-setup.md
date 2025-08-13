# Cognitoアプリケーションクライアント作成ガイド

## AWSコンソールでの作成手順

### 1. Cognitoコンソールにアクセス
1. [AWS Cognitoコンソール](https://console.aws.amazon.com/cognito/)にログイン
2. リージョンが「アジアパシフィック（東京）ap-northeast-1」であることを確認

### 2. ユーザープールを選択
- User Pool ID: `ap-northeast-1_B38FHxujm` を選択

### 3. アプリケーションクライアントの作成
1. 左側メニューから「アプリケーションの統合」→「アプリケーションクライアント」を選択
2. 「アプリケーションクライアントを作成」をクリック

### 4. 基本設定
以下の設定を行います：

#### アプリケーションタイプ
- ✅ **機密クライアント**を選択（重要：バックエンドAPIサーバー用）

#### アプリケーションクライアント名
```
monstera-backend-client
```

#### クライアントシークレット
- ✅ **クライアントシークレットを生成**にチェック

### 5. 認証フロー設定
#### 認証フロー
以下にチェックを入れる：
- ✅ ALLOW_USER_PASSWORD_AUTH（ユーザー名とパスワードによる認証）
- ✅ ALLOW_REFRESH_TOKEN_AUTH（リフレッシュトークンによる認証）

### 6. ホストされたUIの設定（オプション）
今回はAPIのみの使用なので、以下の設定は任意：

#### 許可されているコールバックURL
```
http://localhost:3000/callback
```

#### 許可されているサインアウトURL
```
http://localhost:3000/logout
```

### 7. 詳細設定
#### トークンの有効期限
- アクセストークン: 60分（デフォルト）
- IDトークン: 60分（デフォルト）
- リフレッシュトークン: 30日（デフォルト）

#### セキュリティ設定
- ✅ **ユーザー存在エラーの防止を有効化**

### 8. 作成完了
「作成」をクリックして、アプリケーションクライアントを作成

### 9. 認証情報の取得
作成後、以下の情報をコピー：
- **クライアントID**: 例 `7abc123def456ghi789jkl012`
- **クライアントシークレット**: 「表示」をクリックして取得

## 環境変数の設定

取得した情報で`.env`を更新：

### 本番環境用設定

```bash
# 実行環境
GO_ENV=production

# Cognito User Pool情報
COGNITO_ENABLED=true
COGNITO_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=ap-northeast-1_B38FHxujm
COGNITO_CLIENT_ID=7abc123def456ghi789jkl012     # 実際のClient IDに置き換え
COGNITO_CLIENT_SECRET=your-actual-client-secret  # 実際のClient Secretに置き換え

# Cookie設定（本番環境）
SECURE_COOKIES=true      # HTTPS必須
COOKIE_SAME_SITE=strict  # 最高セキュリティ

# ⚠️ 重要: 本番環境では以下の設定は禁止
# COGNITO_ENDPOINT=  # 本番環境では設定しない（エラーになる）
# AUTH_SKIP_MODE=   # 本番環境では無効または未設定
```

### 開発環境用設定（ローカルCognitoエミュレーター使用時）

```bash
# 実行環境
GO_ENV=development

# Cognito設定（エミュレーター使用）
COGNITO_ENABLED=true
COGNITO_ENDPOINT=http://localhost:9229  # Cognito Localエミュレーター
COGNITO_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=local_pool_id
COGNITO_CLIENT_ID=local_client_id
COGNITO_CLIENT_SECRET=local_secret

# Cookie設定（開発環境）
SECURE_COOKIES=false     # HTTP許可
COOKIE_SAME_SITE=lax     # 柔軟な設定
```

### 開発環境用設定（認証スキップモード）

```bash
# 実行環境
GO_ENV=development

# 認証スキップモード（簡易開発用）
COGNITO_ENABLED=false
AUTH_SKIP_MODE=true
DEV_USER_ROLE=2  # 0:Employee, 1:SuperAdmin, 2:Admin, 3:Sales

# Cookie設定（開発環境）
SECURE_COOKIES=false
COOKIE_SAME_SITE=lax
```

## 作成後の確認

### AWS CLIで確認
```bash
aws cognito-idp describe-user-pool-client \
  --user-pool-id ap-northeast-1_B38FHxujm \
  --client-id your-client-id \
  --region ap-northeast-1
```

### 重要な注意事項
- **クライアントシークレットは一度しか表示されません**
- 必ずコピーして安全な場所に保管してください
- 紛失した場合は、新しいシークレットを生成する必要があります

## 環境別設定ガイド

### 環境変数一覧

| 変数名 | 説明 | 開発 | ステージング | 本番 |
|--------|------|------|------------|------|
| GO_ENV | 実行環境 | development | staging | production |
| COGNITO_ENABLED | Cognito有効化 | false/true | true | true |
| AUTH_SKIP_MODE | 認証スキップ | true/false | false | false |
| COGNITO_ENDPOINT | エミュレーターURL | 設定可 | 設定不可 | 設定不可 |
| SECURE_COOKIES | Cookie Secure | false | true | true |
| COOKIE_SAME_SITE | SameSite属性 | lax | strict | strict |
| DEV_USER_ROLE | 開発用ロール | 0-3 | - | - |

### 環境判定ロジック

システムは`GO_ENV`で環境を判定し、自動的に適切な設定を適用します：

```go
// backend/internal/config/cognito.go

// 開発環境
func (c *CognitoConfig) IsDevelopment() bool {
    return c.Environment == "development" || c.Environment == "dev" || c.Environment == ""
}

// 本番環境
func (c *CognitoConfig) IsProduction() bool {
    return c.Environment == "production" || c.Environment == "prod"
}

// ステージング環境
func (c *CognitoConfig) IsStaging() bool {
    return c.Environment == "staging" || c.Environment == "stage"
}
```

### セキュリティ設定

#### Cookieセキュリティ

1. **HTTPOnly**: 常にtrue（JavaScriptからアクセス不可）
2. **Secure**: HTTPS環境で必須
3. **SameSite**: CSRF対策
   - strict: 最も厳格（本番推奨）
   - lax: バランス型（開発/ステージング）
   - none: クロスサイト許可（Secure必須）

#### COGNITO_ENDPOINTの制限

```go
// 本番環境ではCOGNITO_ENDPOINTを設定してはいけない
if c.IsProduction() && c.Endpoint != "" {
    return false // 設定エラー
}
```

## トラブルシューティング

### エラー: ResourceNotFoundException
- User Pool IDが正しいか確認
- リージョンが正しいか確認
- `GO_ENV`が正しく設定されているか確認

### エラー: InvalidParameterException
- 認証フローの設定を確認
- クライアント名が既に使用されていないか確認
- `COGNITO_ENDPOINT`が本番環境で設定されていないか確認

### エラー: Cookie関連
- `SECURE_COOKIES`と環境の整合性を確認
- `COOKIE_SAME_SITE`が正しい値か確認
- HTTPS環境で`SECURE_COOKIES=true`か確認

## 関連ドキュメント

- [認証設定ガイド](../05_architecture/authentication-setup.md)
- [認証実装詳細](../01_backend/implementation/auth-implementation.md)
- [エラーコード標準](../06_standards/error-code-standard.md)