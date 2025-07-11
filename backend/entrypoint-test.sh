#!/bin/bash

# =============================================================================
# Monstera Backend テスト環境用 エントリーポイント
# =============================================================================

set -euo pipefail

# 環境変数の設定
export DB_HOST="${DB_HOST:-postgres-test}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME="${DB_NAME:-monstera_test}"
export DB_USER="${DB_USER:-monstera}"
export DB_PASSWORD="${DB_PASSWORD:-password}"
export DB_DRIVER="${DB_DRIVER:-postgres}"
export GO_ENV="${GO_ENV:-test}"

echo "=== Monstera Backend テスト環境起動 ==="
echo "Database: ${DB_DRIVER}://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "Environment: ${GO_ENV}"

# PostgreSQL接続待機関数
wait_for_postgres() {
    echo "PostgreSQL接続待機中..."
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
            echo "PostgreSQL接続成功"
            return 0
        fi
        
        echo "PostgreSQL接続待機中... (${attempt}/${max_attempts})"
        sleep 2
        ((attempt++))
    done
    
    echo "エラー: PostgreSQL接続タイムアウト"
    return 1
}

# マイグレーション実行
run_migrations() {
    echo "データベースマイグレーション実行..."
    
    # PostgreSQL接続文字列
    local db_url="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
    
    # golang-migrateが利用可能か確認
    if command -v migrate &> /dev/null; then
        migrate -path /app/migrations -database "${db_url}" up
        echo "マイグレーション実行完了"
    else
        echo "警告: golang-migrateが見つかりません。マイグレーションをスキップします。"
    fi
}

# アプリケーション起動前の準備
prepare_app() {
    echo "アプリケーション起動準備..."
    
    # ログディレクトリ作成
    mkdir -p /app/logs
    
    # テンプレートディレクトリ確認
    if [ ! -d "/app/templates" ]; then
        mkdir -p /app/templates
        echo "テンプレートディレクトリを作成しました"
    fi
    
    # テスト用の基本設定確認
    echo "テスト環境設定確認完了"
}

# アプリケーション起動
start_app() {
    echo "Monstera Backend (テスト環境) 起動中..."
    
    # Go モジュール更新（開発環境用）
    if [ "${GO_ENV}" = "development" ] || [ "${GO_ENV}" = "test" ]; then
        echo "Go モジュール更新中..."
        go mod tidy
        go mod download
    fi
    
    # アプリケーション実行
    if [ -f "/app/main" ]; then
        # ビルド済みバイナリが存在する場合
        echo "ビルド済みバイナリを実行"
        exec /app/main
    elif [ -f "/app/cmd/server/main.go" ]; then
        # main.goから直接実行
        echo "ソースコードから実行"
        cd /app
        exec go run cmd/server/main.go
    else
        echo "エラー: 実行可能ファイルが見つかりません"
        exit 1
    fi
}

# ヘルスチェック用関数
health_check() {
    echo "ヘルスチェック実行..."
    
    # データベース接続確認
    if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
        echo "ヘルスチェック失敗: データベース接続不可"
        return 1
    fi
    
    echo "ヘルスチェック成功"
    return 0
}

# シグナルハンドラー
cleanup() {
    echo "アプリケーション終了処理..."
    # 必要に応じてクリーンアップ処理を追加
    exit 0
}

# メイン処理
main() {
    # シグナルハンドラー設定
    trap cleanup SIGTERM SIGINT
    
    # 引数による動作切り替え
    case "${1:-start}" in
        "start")
            wait_for_postgres || exit 1
            run_migrations
            prepare_app
            start_app
            ;;
        "migrate")
            wait_for_postgres || exit 1
            run_migrations
            ;;
        "health")
            health_check
            ;;
        "test")
            echo "テストモード起動"
            wait_for_postgres || exit 1
            run_migrations
            prepare_app
            
            # テスト実行
            cd /app
            go test ./... -v
            ;;
        "shell")
            echo "シェルモード"
            exec /bin/bash
            ;;
        *)
            echo "使用方法: $0 [start|migrate|health|test|shell]"
            exit 1
            ;;
    esac
}

# PostgreSQLクライアントがインストールされているか確認
if ! command -v pg_isready &> /dev/null; then
    echo "PostgreSQLクライアントをインストール中..."
    apt-get update && apt-get install -y postgresql-client
fi

# スクリプト実行
main "$@"