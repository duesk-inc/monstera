# Cognito認証情報更新手順

## 現在の状況
- Cognito User Poolが組織アカウント（307031016432）に存在
- 現在の認証情報は別アカウント（879381244492）のもの
- 組織アカウントの認証情報に更新が必要

## 手順

### 1. IAM Identity Centerから組織アカウントの認証情報を取得

1. AWS IAM Identity Center（SSO）にログイン
   - URL: `https://d-90679dd0a1.awsapps.com/start`

2. **組織アカウント（307031016432）**を選択
   - アカウント名を確認して正しいアカウントを選択

3. 「Command line or programmatic access」をクリック

4. 「Option 2: Short-term credentials」から以下をコピー：
   - AWS Access Key ID
   - AWS Secret Access Key
   - AWS Session Token

### 2. .env.cognitoファイルを更新

```bash
# AWS認証情報（Cognito APIアクセス用）
# 組織アカウント（307031016432）の認証情報
AWS_ACCESS_KEY_ID=<新しいAccess Key ID>
AWS_SECRET_ACCESS_KEY=<新しいSecret Access Key>
AWS_SESSION_TOKEN=<新しいSession Token>
```

### 3. Cognito User Pool情報（変更不要）

```bash
# Cognito User Pool情報
COGNITO_USER_POOL_ID=ap-northeast-1_B38FHxujm
COGNITO_REGION=ap-northeast-1
```

## 確認事項

組織アカウントのCognito User Pool:
- User Pool名: monstera-dev-user-pool
- User Pool ID: ap-northeast-1_B38FHxujm
- アカウントID: 307031016432

## 注意
- 必ず組織アカウント（307031016432）の認証情報を使用すること
- 一時認証情報は12時間で期限切れになるため、定期的な更新が必要