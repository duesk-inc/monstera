# Monstera Cognito Infrastructure

このディレクトリには、Monstera開発環境用のAWS Cognitoインフラストラクチャのコードが含まれています。

## 開発環境での認証設定

### 認証スキップモード（推奨）

開発環境では、Cognito Localの代わりに認証スキップモードを使用することを推奨します。

**設定方法:**
```env
# backend/.env
COGNITO_ENABLED=false
AUTH_SKIP_MODE=true
```

この設定により、開発環境では自動的に管理者権限を持つ開発用ユーザー（dev@duesk.co.jp）が設定され、認証処理がスキップされます。

### AWS Cognito（本番環境）

本番環境や統合テスト環境では、実際のAWS Cognitoを使用します。以下の手順に従ってセットアップしてください。

## 前提条件

- AWS CLI v2 がインストールされていること
- Node.js 18.x以上
- AWS CDK CLI (`npm install -g aws-cdk`)
- IAM Identity Center (SSO) が設定されていること

## セットアップ手順

### 1. AWS SSO プロファイルの設定

```bash
# SSO プロファイルを設定
aws configure sso --profile monstera-dev

# 入力項目:
# SSO session name: monstera-sso
# SSO start URL: https://d-xxxxxxxxxx.awsapps.com/start
# SSO region: ap-northeast-1
# → 利用可能なアカウントとロールを選択

# ログイン
aws sso login --profile monstera-dev
```

### 2. CDK Bootstrap（初回のみ）

CDK Bootstrap には IAM ロール作成権限が必要です。以下のいずれかの方法で実行：

**方法A: 一時的な権限昇格（推奨）**
1. IAM Identity Center で `CDKBootstrapAccess` 許可セットを作成（IAMロール作成権限を含む）
2. 一時的に自分のアカウントに割り当て
3. Bootstrap 実行後、割り当てを削除

**方法B: 管理者による実行**
管理者権限を持つユーザーが直接実行

```bash
# 依存関係インストール
cd infrastructure/cognito
npm install

# Bootstrap 実行（アカウントIDは実際の値に置換）
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-northeast-1 --profile monstera-dev
```

### 3. Cognito User Pool のデプロイ

```bash
# デプロイ実行
npx cdk deploy MonsteraCognitoDev --profile monstera-dev

# または npm script を使用
npm run deploy -- --profile monstera-dev
```

## 作成されるリソース

- **Cognitoユーザープール**: `monstera-dev-user-pool`
  - Eメール認証
  - カスタム属性: role, department_id, employee_id
  - パスワードポリシー: 最小8文字、大文字小文字数字記号必須

- **アプリクライアント**: `monstera-dev-app-client`
  - AdminInitiateAuth有効
  - クライアントシークレット付き
  - アクセストークン有効期限: 1時間
  - リフレッシュトークン有効期限: 7日間

- **ユーザーグループ**:
  - admins: 管理者グループ
  - managers: マネージャーグループ
  - users: 一般ユーザーグループ

- **IAMロール**: Cognito管理操作用

## デプロイ後の設定

### 1. 出力値の確認

デプロイが完了すると、以下の値が出力されます：

```
Outputs:
MonsteraCognitoDev.UserPoolId = ap-northeast-1_XXXXXXXXX
MonsteraCognitoDev.AppClientId = XXXXXXXXXXXXXXXXXXXXXXXXX
MonsteraCognitoDev.JwksUri = https://cognito-idp.ap-northeast-1.amazonaws.com/...
MonsteraCognitoDev.CognitoIssuer = https://cognito-idp.ap-northeast-1.amazonaws.com/...
```

### 2. 環境変数の設定

`backend/.env` を更新：

```env
# Cognito Configuration (AWS Deployed)
COGNITO_ENABLED=true
AUTH_SKIP_MODE=false  # 本番環境では無効化
COGNITO_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=<出力されたUserPoolId>
COGNITO_CLIENT_ID=<出力されたAppClientId>
COGNITO_CLIENT_SECRET=<下記コマンドで取得>
COGNITO_ISSUER=<出力されたCognitoIssuer>
```

### 3. Client Secret の取得

```bash
aws cognito-idp describe-user-pool-client \
  --user-pool-id <UserPoolId> \
  --client-id <AppClientId> \
  --region ap-northeast-1 \
  --profile monstera-dev \
  --query 'UserPoolClient.ClientSecret' \
  --output text
```

### 4. バックエンドの再起動

```bash
cd ../../backend
docker-compose restart api
```

## テストユーザーの作成

管理者ユーザーを作成する例：

```bash
# ユーザー作成
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username admin@duesk.co.jp \
  --user-attributes \
    Name=email,Value=admin@duesk.co.jp \
    Name=given_name,Value=Admin \
    Name=family_name,Value=User \
    Name=custom:role,Value=2 \
    Name=custom:department_id,Value=dept-001 \
    Name=custom:employee_id,Value=emp-001 \
  --temporary-password TempPass123! \
  --message-action SUPPRESS

# パスワード設定
aws cognito-idp admin-set-user-password \
  --user-pool-id <UserPoolId> \
  --username admin@duesk.co.jp \
  --password AdminPass123! \
  --permanent

# グループに追加
aws cognito-idp admin-add-user-to-group \
  --user-pool-id <UserPoolId> \
  --username admin@duesk.co.jp \
  --group-name admins
```

## スタックの更新・削除

### 更新
```bash
# 変更をデプロイ
npx cdk deploy MonsteraCognitoDev --profile monstera-dev

# 差分を確認（デプロイなし）
npx cdk diff MonsteraCognitoDev --profile monstera-dev
```

### 削除
```bash
npx cdk destroy MonsteraCognitoDev --profile monstera-dev
```

**注意**: ユーザープールは`RemovalPolicy.RETAIN`に設定されているため、スタック削除後も保持されます。

## 環境別の設定方法

### 開発環境（ローカル）
```env
COGNITO_ENABLED=false
AUTH_SKIP_MODE=true
```
- 認証処理をスキップし、開発用ユーザーを自動設定
- 外部サービスへの依存なし

### ステージング/本番環境
```env
COGNITO_ENABLED=true
AUTH_SKIP_MODE=false
COGNITO_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=<実際のUserPoolId>
COGNITO_CLIENT_ID=<実際のAppClientId>
COGNITO_CLIENT_SECRET=<実際のClientSecret>
```
- 実際のAWS Cognitoを使用
- トークン認証が有効

## トラブルシューティング

### "Stack is in ROLLBACK_FAILED state"
```bash
# 失敗したスタックを削除
aws cloudformation delete-stack \
  --stack-name monstera-cognito-dev \
  --region ap-northeast-1 \
  --profile monstera-dev

# 削除完了を待ってから再デプロイ
```

### "Invalid write attributes" エラー
- カスタム属性（custom:role等）は書き込み不可
- UserPoolClient の writeAttributes から削除が必要

### CDK Bootstrap 権限エラー
- IAM ロール作成権限が必要
- 上記の「CDK Bootstrap」セクションを参照

### SSO セッション期限切れ
```bash
aws sso login --profile monstera-dev
```

## 参考資料

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/v2/guide/)
- [Amazon Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)