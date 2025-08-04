# 開発用IAMユーザー設定ガイド

## 概要
1人開発の効率化のため、IAM Identity Centerから従来のIAMユーザーへの移行手順。

## IAMユーザー作成手順

### 1. IAMユーザーの作成
```bash
# AWSコンソールで実行
# IAM → ユーザー → ユーザーを作成
# ユーザー名: monstera-dev
# アクセスキー - プログラムによるアクセス: ✓
```

### 2. 必要な権限ポリシー
開発に必要な最小限の権限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:*",
        "s3:*",
        "ecr:*",
        "ec2:Describe*",
        "iam:GetUser",
        "iam:ListAttachedUserPolicies"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. AWS CLI設定
```bash
# 新しいプロファイルを作成
aws configure --profile monstera-dev

# 以下を入力
AWS Access Key ID: [作成したアクセスキー]
AWS Secret Access Key: [作成したシークレットキー]
Default region name: ap-northeast-1
Default output format: json
```

### 4. プロファイルの使用
```bash
# デフォルトプロファイルとして設定
export AWS_PROFILE=monstera-dev

# または個別コマンドで指定
aws cognito-idp list-user-pools --profile monstera-dev
```

## セキュリティのベストプラクティス

### 開発環境のみでの使用
- 本番環境では絶対に使用しない
- アクセスキーは定期的にローテーション（3ヶ月ごと）

### 環境変数管理
```bash
# .env.aws（.gitignoreに追加済み）
AWS_PROFILE=monstera-dev
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### MFA（多要素認証）の設定
```bash
# IAMコンソールでMFAを有効化
# 仮想MFAデバイスを使用（Google Authenticator等）
```

## 将来的な移行計画

### フェーズ1（現在〜3ヶ月）
- 従来のIAMで開発効率を最大化
- Cognito統合を完成

### フェーズ2（3〜6ヶ月）
- チーム拡大時にIAM Identity Centerへ移行検討
- 権限管理の体系化

### フェーズ3（6ヶ月〜）
- 本番環境はIAM Identity Center必須
- 開発環境も統一を検討

## 即座に実行可能なコマンド

IAMユーザー作成後、以下が即座に実行可能：

```bash
# Cognitoアプリクライアント作成
./scripts/create-cognito-client.sh

# ユーザープール一覧
aws cognito-idp list-user-pools

# その他の開発作業
```