# Monstera - SES企業向け社内業務管理システム

## 概要

MonsteraはSES企業向けの統合的な社内業務管理システムです。週報管理、休暇申請、経費申請、エンジニア管理など、SES企業の日常業務をワンストップで効率化します。

## 主な機能

- **週報管理**: 週次報告書の作成・提出・承認
- **休暇管理**: 休暇申請・承認・残日数管理
- **経費申請**: 経費申請・承認・精算
- **エンジニア管理**: エンジニア情報・スキル・プロジェクト履歴
- **プロファイル管理**: 個人情報・経歴・スキル
- **スキルシート管理**: スキルシートの生成・PDF出力
- **案件管理**: プロジェクト・クライアント情報
- **請求書管理**: 請求書作成・管理
- **提案管理**: 営業提案・質問管理

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 15.3.2 (App Router)
- **言語**: TypeScript 5.5.4
- **UI**: Material-UI (MUI) v7.1.0
- **状態管理**: React Context + React Query v5.80.7

### バックエンド
- **フレームワーク**: Gin v1.8.1
- **言語**: Go 1.23.0 / 1.24.0
- **ORM**: GORM v1.30.0
- **認証**: JWT + AWS Cognito

### インフラ
- **データベース**: PostgreSQL 15
- **キャッシュ**: Redis 7
- **コンテナ**: Docker & Docker Compose
- **マイグレーション**: golang-migrate

## セットアップ

### 前提条件

- Docker Desktop
- Go 1.23以上
- Node.js 20以上
- Make

### 初回セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd monstera

# 初期セットアップ
make setup

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要な値を設定

# 開発環境の起動
make dev
```

### アクセスURL

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8080
- pgAdmin: http://localhost:5050

## 開発

### 主要なコマンド

```bash
# 開発環境の起動/停止
make dev      # 全サービス起動
make down     # 全サービス停止
make dev-logs # ログ表示

# データベース操作
make migrate-up      # マイグレーション実行
make migrate-down    # マイグレーションロールバック
make db-psql        # PostgreSQLクライアント接続

# テスト実行
make test           # 全テスト実行
make test-backend   # バックエンドテスト
make test-frontend  # フロントエンドテスト

# 品質管理
make lint     # リント実行
make lint-fix # リント自動修正
make format   # コードフォーマット
```

## ドキュメント

詳細なドキュメントは[docs](./docs)ディレクトリを参照してください：

- [プロジェクト概要](./docs/00_project_overview/README.md)
- [バックエンド仕様](./docs/01_backend/specification.md)
- [フロントエンド仕様](./docs/02_frontend/specification.md)
- [データベース設計](./docs/03_database/ddl-specification.md)
- [開発環境ガイド](./docs/04_development/dev-environment-guide.md)
- [コーディング規約](./docs/06_standards/coding-standards.md)

## 実装ガイドライン

プロジェクトの実装ガイドラインは[CLAUDE.md](./CLAUDE.md)を参照してください。

## ライセンス

[ライセンス情報を記載]