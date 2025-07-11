# Cognito Local 開発環境設定

## 概要

このディレクトリには、ローカル開発環境で使用するCognito Localのモックデータが含まれています。
Cognito Localは、AWS Cognitoのエミュレータであり、開発・テスト環境での認証機能の検証に使用されます。

**⚠️ 重要: このディレクトリの内容は開発環境専用です。本番環境では使用しないでください。**

## ディレクトリ構成

```
cognito/
├── config.json          # Cognito Local設定ファイル
├── db/                  # モックデータ
│   ├── clients.json     # アプリケーションクライアント設定
│   └── local_7221v1tw.json  # ユーザープール・ユーザーデータ
└── README.md           # このファイル
```

## テストユーザー情報

### 管理者ユーザー
- **Email**: admin@duesk.co.jp
- **Password**: AdminPass123!
- **Role**: 2 (管理者)
- **Department ID**: dept-001
- **Employee ID**: emp-001

### 一般ユーザー
- **Email**: user@duesk.co.jp
- **Password**: UserPass123!
- **Role**: 0 (一般)
- **Department ID**: dept-002
- **Employee ID**: emp-002

### スーパー管理者ユーザー
- **Email**: super@duesk.co.jp
- **Password**: SuperPass123!
- **Role**: 1 (スーパー管理者)
- **Department ID**: dept-001
- **Employee ID**: emp-003

## 環境変数設定

### 必須環境変数

```bash
# Cognito設定
COGNITO_USER_POOL_ID=local_7221v1tw
COGNITO_CLIENT_ID=62h69i1tpbn9rmh83xmtjyj4b
COGNITO_CLIENT_SECRET=47c44j2dkj2y4tkf777zqgpiw
COGNITO_ENDPOINT=http://cognito-local:9229

# AWS設定（ローカル開発用）
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
AWS_REGION=ap-northeast-1
AWS_EC2_METADATA_DISABLED=true
```

### Docker Compose環境

docker-compose.ymlで自動的に設定されるため、追加設定は不要です。

## 使用方法

### 1. 開発環境の起動

```bash
# Docker Composeで全サービスを起動
make dev

# または
docker-compose up -d
```

### 2. Cognito Localの確認

```bash
# ヘルスチェック
curl http://localhost:9229/health

# ユーザープール情報の確認
curl http://localhost:9229/local_7221v1tw
```

### 3. ログイン例

```bash
# 管理者でログイン
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@duesk.co.jp",
    "password": "AdminPass123!"
  }'
```

## トラブルシューティング

### Cognito Localが起動しない

```bash
# ログを確認
docker-compose logs cognito-local

# コンテナの状態を確認
docker-compose ps cognito-local

# 再起動
docker-compose restart cognito-local
```

### 認証エラーが発生する

1. 環境変数が正しく設定されているか確認
2. Cognito Localが正常に起動しているか確認
3. バックエンドのログを確認：`docker-compose logs backend`

### データがリセットされた

Cognito Localはメモリベースで動作するため、コンテナを再起動するとデータが初期状態に戻ります。
永続化が必要な場合は、`./cognito`ディレクトリのマウントが正しく設定されているか確認してください。

## セキュリティ注意事項

1. **パスワード**: テストユーザーのパスワードは公開されているため、開発環境でのみ使用してください
2. **クライアントシークレット**: 開発環境用の値です。本番環境では必ず別の値を使用してください
3. **RefreshToken**: db/local_7221v1tw.jsonに含まれるトークンは開発用のモックデータです

## E2Eテスト環境

E2Eテスト実行時は、別ポート（9230）で起動します：

```bash
# E2Eテスト環境の起動
docker-compose -f docker-compose.e2e.yml up -d

# E2E用のCognito Localエンドポイント
COGNITO_ENDPOINT=http://cognito-local-e2e:9229
```

## 参考リンク

- [Cognito Local GitHub](https://github.com/jagregory/cognito-local)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [プロジェクト認証仕様](../docs/01_backend/implementation/auth-implementation.md)