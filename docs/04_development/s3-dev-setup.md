# 開発環境での AWS S3 利用手順

本書は MinIO を使わずに実 AWS S3 を開発環境で利用するための手順です。

## 前提
- バケット名: `monstera-dev-bucket`
- リージョン: `ap-northeast-1`
- 認証方式: AWS SSO の一時クレデンシャル

## 1. バケット作成
AWS コンソールまたは CLI で `monstera-dev-bucket` を `ap-northeast-1` に作成します。

## 2. CORS 設定（フロントエンドからの直アップロード用）
フロントエンドはバックエンドで発行した Pre-signed URL に対してブラウザから直接 PUT を行います。
S3 バケットの CORS を以下のように設定してください。

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

注意: 本番環境ではオリジンを実ドメインに限定してください。

## 3. （開発簡便化）オブジェクトの公開可否
現行コードでは、領収書閲覧時に `GetFileURL` が公開 URL を返します。
開発で手早く確認するため、以下いずれかを選択してください。

- 推奨（安全）: バックエンドを拡張し、閲覧時は Pre-signed GET を返す（要実装）
- 簡易（開発限定）: バケットポリシーで公開読み取りを許可（`receipts/*` のみ）

公開読み取りを用いる場合の最小ポリシー例:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicReadForReceipts",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::monstera-dev-bucket/receipts/*"
    }
  ]
}
```

注: 開発用途に限定してください。本番では Pre-signed GET または CloudFront + 署名付き URL を推奨します。

## 4. IAM 設定（バックエンド用権限）
バックエンドが必要とする最小権限例（開発用ポリシー）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:HeadBucket",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::monstera-dev-bucket"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::monstera-dev-bucket/*"
    }
  ]
}
```

## 5. SSO 一時クレデンシャルの注入
AWS CLI v2 を利用し SSO ログイン後、Docker へ期限付きの環境変数を渡します。

```bash
aws sso login --profile YOUR_SSO_PROFILE
aws configure export-credentials --profile YOUR_SSO_PROFILE --format env > .env.aws
```

`.env.aws` に出力された `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` を `.env` に反映してください（コミット禁止）。

## 6. 環境変数設定（.env）
`.env` のストレージ設定を AWS S3 用にします。

```
USE_MOCK_S3=false
AWS_S3_ENDPOINT=
AWS_S3_ENDPOINT_EXTERNAL=
AWS_S3_BUCKET_NAME=monstera-dev-bucket
AWS_REGION=ap-northeast-1
AWS_S3_BASE_URL=
AWS_S3_PATH_STYLE=false
AWS_S3_DISABLE_SSL=false

# SSO 一時クレデンシャル（有効期限に注意）
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=...
```

## 7. 起動
```
docker compose up -d
```

MinIO はプロファイル `minio` で分離しています。必要時のみ以下で起動:

```
docker compose --profile minio up -d minio minio-setup
```

## 8. 動作確認
- 経費の領収書アップロード: Pre-signed PUT で 200/204 になること
- 領収書表示: `receipt_url` をブラウザで開けること（開発ポリシーを適用した場合）

## 備考（本番方針）
- バケット/オブジェクトの公開は避け、Pre-signed GET もしくは CloudFront の署名付き URL を使用
- `AWS_S3_BASE_URL` に CloudFront ドメインを設定し、`GetFileURL` で配信

