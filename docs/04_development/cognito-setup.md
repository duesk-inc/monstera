# Cognito認証セットアップガイド

## 概要
本ガイドでは、Monstera プロジェクトでAWS Cognito認証を有効にする手順を説明します。

## 前提条件
- AWSアカウントを持っていること
- AWS Cognitoユーザープールが作成済みであること
- AWS CLIがインストール済みであること（オプション）

## セットアップ手順

### 1. AWS Cognitoの設定値を取得

AWS Cognitoコンソールから以下の情報を取得します：

1. **User Pool ID**
   - Cognitoコンソール → ユーザープール → 一般設定
   - 例: `ap-northeast-1_FQjC0zqVt`

2. **App Client ID**
   - Cognitoコンソール → アプリクライアント
   - 例: `5dfijrmjegt1f59sgo1jkcga7f`

3. **App Client Secret**
   - アプリクライアントの詳細から取得
   - 注意: シークレットが有効になっている必要があります

### 2. 環境変数ファイルの設定

1. `.env.cognito`ファイルを作成（既に作成済み）
2. 取得した値を設定：

```bash
# .env.cognito の編集
COGNITO_USER_POOL_ID=ap-northeast-1_FQjC0zqVt  # 実際の値に置き換え
COGNITO_CLIENT_ID=5dfijrmjegt1f59sgo1jkcga7f   # 実際の値に置き換え
COGNITO_CLIENT_SECRET=your-client-secret        # 実際の値に置き換え

# AWS認証情報（Cognito APIアクセス用）
AWS_ACCESS_KEY_ID=your-access-key               # 実際の値に置き換え
AWS_SECRET_ACCESS_KEY=your-secret-key           # 実際の値に置き換え
```

### 3. 環境変数の読み込み

```bash
# 環境変数をエクスポート
export $(cat .env.cognito | grep -v '^#' | xargs)

# または、docker-composeで直接指定
docker-compose --env-file .env.cognito up -d backend
```

### 4. Cognitoユーザーの作成

AWS CLIまたはCognitoコンソールでテストユーザーを作成：

```bash
# AWS CLIを使用する場合
aws cognito-idp admin-create-user \
  --user-pool-id your-user-pool-id \
  --username engineer_test@duesk.co.jp \
  --user-attributes Name=email,Value=engineer_test@duesk.co.jp \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS
```

### 5. 動作確認

1. コンテナを再起動：
```bash
docker-compose down backend
docker-compose --env-file .env.cognito up -d backend
```

2. ログを確認：
```bash
docker logs -f monstera-backend
```

3. ログインテスト：
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "engineer_test@duesk.co.jp",
    "password": "EmployeePass123!"
  }'
```

## トラブルシューティング

### エラー: InvalidParameterException
- 原因: Cognito設定値が正しく設定されていない
- 対処: `.env.cognito`の値を確認

### エラー: NotAuthorizedException
- 原因: ユーザーが存在しないか、パスワードが間違っている
- 対処: Cognitoコンソールでユーザーを確認

### エラー: UserNotFoundException
- 原因: 指定したメールアドレスのユーザーが存在しない
- 対処: Cognitoでユーザーを作成

## セキュリティのベストプラクティス

1. **環境変数の管理**
   - `.env.cognito`は絶対にGitにコミットしない
   - 本番環境では環境変数をセキュアに管理（AWS Secrets Manager等）

2. **最小権限の原則**
   - AWS認証情報は必要最小限の権限のみ付与
   - Cognito操作に必要な権限のみ

3. **定期的なローテーション**
   - Client Secretは定期的に更新
   - AWS認証情報も定期的にローテーション

## 開発環境へ戻す方法

Cognito認証を無効にして開発環境モードに戻す場合：

```bash
# .envファイルを編集
COGNITO_ENABLED=false
AUTH_SKIP_MODE=true

# コンテナ再起動
docker-compose down backend
docker-compose up -d backend
```