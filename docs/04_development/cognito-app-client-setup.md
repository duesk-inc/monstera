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

## .env.cognitoファイルの更新

取得した情報で`.env.cognito`を更新：

```bash
# Cognito User Pool情報
COGNITO_USER_POOL_ID=ap-northeast-1_B38FHxujm
COGNITO_CLIENT_ID=7abc123def456ghi789jkl012     # 実際のClient IDに置き換え
COGNITO_CLIENT_SECRET=your-actual-client-secret  # 実際のClient Secretに置き換え

# オプション設定（User Pool IDを含むように更新）
COGNITO_ENDPOINT=https://cognito-idp.ap-northeast-1.amazonaws.com
COGNITO_ISSUER=https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_B38FHxujm
COGNITO_JWKS_URI=https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_B38FHxujm/.well-known/jwks.json
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

## トラブルシューティング

### エラー: ResourceNotFoundException
- User Pool IDが正しいか確認
- リージョンが正しいか確認

### エラー: InvalidParameterException
- 認証フローの設定を確認
- クライアント名が既に使用されていないか確認