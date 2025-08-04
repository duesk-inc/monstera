# Scripts ディレクトリ

このディレクトリには、Monsteraプロジェクトの開発・運用に必要な各種スクリプトが用途別に整理されています。

## ディレクトリ構成

```
scripts/
├── auth/                  # 認証関連スクリプト
├── build-deploy/          # ビルド・デプロイ関連
├── data-management/       # データ管理・テストデータ
├── database/              # データベース関連
│   └── postgresql/        # PostgreSQL専用スクリプト
└── e2e-testing/           # E2Eテスト関連
```

## 各ディレクトリの説明

### auth/ - 認証関連
Cognito認証の処理に関するスクリプト
- `setup-local-cognito.sh` - ローカルCognito環境のセットアップ
- `test-cognito-login.sh` - Cognitoログインテスト
- `manual-login-test.sh` - 手動ログインテスト

### build-deploy/ - ビルド・デプロイ関連
プロジェクトのビルドとデプロイに関するスクリプト
- `test_builds.sh` - フロントエンド・バックエンドのビルドテスト

### data-management/ - データ管理
テストデータの投入や業務フローのテストに関するスクリプト
- `test-data-insert.sh` - テストデータの投入
- `test-proposal-flow.sh` - 提案フローのテスト

### database/postgresql/ - PostgreSQL関連
PostgreSQLの管理・監視・パフォーマンス分析に関するスクリプト
- `postgres-dev.sh` - PostgreSQL開発環境管理（起動、停止、接続など）
- `postgresql-container-manager.sh` - PostgreSQLコンテナ管理
- `postgresql-performance-monitor.sql` - パフォーマンス監視SQL
- `query-performance-analyzer.go` - クエリパフォーマンス分析ツール（Go言語）
- `query-benchmark-tests.sql` - ベンチマークテスト用SQL
- `explain-analyze-performance-test.sh` - EXPLAIN ANALYZEを使用したパフォーマンステスト
- `validate-postgres-env.sh` - PostgreSQL環境の検証
- `run-performance-analysis.sh` - パフォーマンス分析の実行
- `go.mod`, `go.sum` - Go言語の依存関係管理

### e2e-testing/ - E2Eテスト関連
E2Eテストの実行と環境管理に関するスクリプト
- `run-e2e-tests.sh` - E2Eテストの実行（CI/CD向け統合スクリプト）
- `setup-e2e-test.sh` - E2Eテスト環境のセットアップ
- `setup-e2e-test-quick.sh` - E2Eテスト環境の高速セットアップ
- `cleanup-e2e-test.sh` - E2Eテスト環境のクリーンアップ
- `cleanup-e2e-test-quick.sh` - E2Eテスト環境の高速クリーンアップ
- `verify-e2e-env.sh` - E2E環境の検証

## 使用方法

各スクリプトは基本的に実行権限を付与して実行します：

```bash
# 実行権限の付与
chmod +x scripts/database/postgresql/postgres-dev.sh

# スクリプトの実行
./scripts/database/postgresql/postgres-dev.sh start
```

## 注意事項

1. **環境変数**: 多くのスクリプトは`.env`ファイルの環境変数を参照します
2. **実行環境**: Dockerが必要なスクリプトが多いため、事前にDockerをインストールしてください
3. **権限**: データベース関連のスクリプトは適切な権限が必要です
4. **CI/CD**: `e2e-testing/`配下のスクリプトはCI/CD環境での実行も考慮されています

## 開発者向け情報

新しいスクリプトを追加する場合は、適切なディレクトリに配置し、このREADMEを更新してください。