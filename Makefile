.PHONY: help setup dev dev-logs down test lint format migrate migrate-down migrate-up migrate-status migrate-create db-reset db-dump db-restore db-psql minio-console minio-create-bucket minio-ls clean build test-e2e-setup test-e2e test-e2e-ui test-e2e-debug test-e2e-cleanup test-e2e-logs

# デフォルトターゲット
.DEFAULT_GOAL := help

# ヘルプ
help: ## ヘルプを表示
	@echo "Monstera プロジェクト - 開発用コマンド"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# セットアップ
setup: ## 初期セットアップ（環境構築）
	@echo "=== 開発環境のセットアップを開始 ==="
	@if [ ! -f .env ]; then cp .env.example .env && echo "✓ .env ファイルを作成しました"; fi
	@echo "=== Dockerイメージのビルド ==="
	@docker-compose build
	@echo "=== フロントエンドの依存関係インストール ==="
	@cd frontend && npm install
	@echo "=== バックエンドの依存関係インストール ==="
	@cd backend && go mod download
	@echo "=== セットアップ完了 ==="

# 開発サーバー
dev: ## 開発サーバー起動
	@echo "=== 開発サーバーを起動します ==="
	@docker-compose up -d
	@echo "✓ 起動完了"
	@echo "  - Frontend: http://localhost:3000"
	@echo "  - Backend API: http://localhost:8080"
	@echo "  - pgAdmin: http://localhost:5050"

dev-logs: ## 開発サーバーのログを表示
	docker-compose logs -f

down: ## 開発サーバー停止
	@echo "=== 開発サーバーを停止します ==="
	docker-compose down

# ビルド
build: ## プロダクションビルド
	@echo "=== プロダクションビルドを実行 ==="
	@echo "→ バックエンドのビルド"
	@cd backend && go build -o bin/server cmd/server/main.go
	@echo "→ フロントエンドのビルド"
	@cd frontend && npm run build
	@echo "✓ ビルド完了"

# テスト
test: ## テスト実行
	@echo "=== テストを実行 ==="
	@echo "→ バックエンドのテスト"
	@docker-compose exec backend go test -v ./...
	@echo "→ フロントエンドのテスト"
	@cd frontend && npm test

test-backend: ## バックエンドのテストのみ実行
	@echo "=== バックエンドのテストを実行 ==="
	@docker-compose exec backend go test -v -race ./...

test-frontend: ## フロントエンドのテストのみ実行
	@echo "=== フロントエンドのテストを実行 ==="
	@cd frontend && npm test

# E2Eテスト
test-e2e-setup: ## E2E環境を起動してテストを実行
	@echo "=== E2E環境のセットアップとテスト実行 ==="
	@echo "→ E2E環境を起動"
	@docker-compose -f docker-compose.e2e.yml up -d
	@echo "→ サービスの起動を待機（30秒）"
	@sleep 30
	@echo "→ E2Eテストを実行"
	@cd frontend && npm run test:e2e
	@echo "✓ E2Eテスト完了"

test-e2e: ## E2Eテストのみ実行（環境は起動済みの前提）
	@echo "=== E2Eテストを実行 ==="
	@cd frontend && npm run test:e2e

test-e2e-ui: ## E2EテストをUIモードで実行
	@echo "=== E2EテストをUIモードで実行 ==="
	@cd frontend && npm run test:e2e:ui

test-e2e-debug: ## E2Eテストをデバッグモードで実行
	@echo "=== E2Eテストをデバッグモードで実行 ==="
	@cd frontend && npm run test:e2e:debug

test-e2e-cleanup: ## E2E環境を停止・削除
	@echo "=== E2E環境をクリーンアップ ==="
	@docker-compose -f docker-compose.e2e.yml down -v
	@echo "✓ クリーンアップ完了"

test-e2e-logs: ## E2E環境のログを表示
	@docker-compose -f docker-compose.e2e.yml logs -f

# 品質チェック
lint: ## リント実行
	@echo "=== コード品質チェック ==="
	@echo "→ バックエンドのリント"
	@docker-compose exec backend go vet ./...
	@echo "→ フロントエンドのリント"
	@cd frontend && npm run lint

lint-fix: ## リントエラーを自動修正
	@echo "=== リントエラーの自動修正 ==="
	@echo "→ フロントエンドの修正"
	@cd frontend && npm run lint -- --fix

format: ## コードフォーマット
	@echo "=== コードフォーマット ==="
	@echo "→ バックエンドのフォーマット"
	@docker-compose exec backend go fmt ./...
	@echo "→ フロントエンドのフォーマット（Prettierが設定されている場合）"
	@cd frontend && npx prettier --write . 2>/dev/null || echo "Prettierが設定されていません"

# データベース操作
migrate: ## DBマイグレーション実行
	@echo "=== データベースマイグレーションを実行 ==="
	docker-compose exec backend migrate -path migrations -database "postgres://postgres:postgres@postgres:5432/monstera?sslmode=disable" up

migrate-down: ## DBマイグレーションロールバック（1つ戻す）
	@echo "=== マイグレーションをロールバック（1つ） ==="
	docker-compose exec backend migrate -path migrations -database "postgres://postgres:postgres@postgres:5432/monstera?sslmode=disable" down 1

migrate-create: ## 新しいマイグレーションファイルを作成（使用例: make migrate-create NAME=add_users_table）
	@if [ -z "$(NAME)" ]; then echo "Error: NAME引数が必要です。例: make migrate-create NAME=add_users_table"; exit 1; fi
	@echo "=== マイグレーションファイルを作成: $(NAME) ==="
	@cd backend && migrate create -ext sql -dir migrations -seq $(NAME)

migrate-up: ## DBマイグレーション実行（migrateのエイリアス）
	@$(MAKE) migrate

migrate-status: ## マイグレーション状態確認
	@echo "=== マイグレーション状態を確認 ==="
	@docker-compose exec backend migrate -path migrations -database "postgres://postgres:postgres@postgres:5432/monstera?sslmode=disable" version

db-reset: ## データベースリセット（開発環境のみ）
	@echo "=== データベースをリセット（開発環境） ==="
	@echo "⚠️  警告: すべてのデータが削除されます！"
	@read -p "続行しますか？ (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS monstera;"
	docker-compose exec postgres psql -U postgres -c "CREATE DATABASE monstera WITH ENCODING 'UTF8' LC_COLLATE='C.UTF-8' LC_CTYPE='C.UTF-8';"
	$(MAKE) migrate
	@echo "✓ データベースリセット完了"

db-dump: ## データベースバックアップ
	@echo "=== データベースをバックアップ ==="
	@docker-compose exec -T postgres pg_dump -U postgres -d monstera > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✓ バックアップファイル: backup_$$(date +%Y%m%d_%H%M%S).sql"

db-restore: ## データベースリストア（使用例: make db-restore DUMP_FILE=backup.sql）
	@if [ -z "$(DUMP_FILE)" ]; then echo "Error: DUMP_FILE引数が必要です。例: make db-restore DUMP_FILE=backup.sql"; exit 1; fi
	@echo "=== データベースをリストア: $(DUMP_FILE) ==="
	@cat $(DUMP_FILE) | docker-compose exec -T postgres psql -U postgres -d monstera
	@echo "✓ リストア完了"

db-seed: ## テストデータ投入
	@echo "=== テストデータを投入 ==="
	@echo "TODO: シードスクリプトを実装してください"

# MinIO管理
minio-console: ## MinIOコンソールのアクセス情報を表示
	@echo "=== MinIO Console ==="
	@echo "URL: http://localhost:9001"
	@echo "Username: minioadmin"
	@echo "Password: minioadmin"
	@echo ""
	@echo "※ 開発環境用の認証情報です。本番環境では変更してください。"

minio-create-bucket: ## MinIOのバケットを作成
	@echo "=== MinIOバケットを作成 ==="
	@docker-compose exec minio sh -c 'mc alias set local http://localhost:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin} && mc mb local/monstera-files --ignore-existing'
	@echo "✓ バケット作成完了"

minio-ls: ## MinIOのファイル一覧を表示
	@echo "=== MinIO内のファイル一覧 ==="
	@docker-compose exec minio sh -c 'mc alias set local http://localhost:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin} && mc ls -r local/monstera-files'

# API テスト
api-test: ## APIテストスクリプトを実行
	@echo "=== APIテストを実行 ==="
	@chmod +x ./scripts/test_api.sh
	@./scripts/test_api.sh

# クリーンアップ
clean: ## クリーンアップ（コンテナ、ボリューム、生成ファイルを削除）
	@echo "=== クリーンアップを実行 ==="
	@echo "→ Dockerコンテナとボリュームを削除"
	docker-compose down -v
	@echo "→ フロントエンドのクリーンアップ"
	@cd frontend && rm -rf node_modules .next out coverage
	@echo "→ バックエンドのクリーンアップ"
	@cd backend && go clean -cache && rm -rf bin/
	@echo "✓ クリーンアップ完了"

# 開発用ユーティリティ
logs-backend: ## バックエンドのログのみ表示
	docker-compose logs -f backend

logs-frontend: ## フロントエンドのログのみ表示
	docker-compose logs -f frontend

logs-postgres: ## PostgreSQLのログのみ表示
	docker-compose logs -f postgres

ps: ## 実行中のコンテナ一覧
	docker-compose ps

db-psql: ## PostgreSQLクライアントに接続
	docker-compose exec postgres psql -U postgres -d monstera

restart: ## 開発サーバー再起動
	$(MAKE) down
	$(MAKE) dev

# 週報機能開発用
weekly-report-refactor: ## 週報機能のリファクタリング準備
	@echo "=== 週報機能リファクタリング準備 ==="
	@echo "1. 既存機能の調査報告書: docs/05_design/P0-T1-weekly-report-investigation.md"
	@echo "2. リファクタリング計画書: docs/05_design/P0-T2-refactoring-plan.md"
	@echo "3. DB最適化計画書: docs/05_design/P0-T3-database-optimization-plan.md"
	@echo "4. エラーコード実装計画書: docs/05_design/P0-T4-error-code-implementation-plan.md"
	@echo "5. 開発環境整備計画書: docs/05_design/P0-T5-dev-cicd-setup-plan.md"