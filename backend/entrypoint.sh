#!/bin/bash

# =============================================================================
# Monstera Backend 統合エントリーポイント
# =============================================================================
# 使用方法: ./entrypoint.sh [start|direct|migrate|health|test|shell]
# - start:   通常起動（DB待機→マイグレーション→アプリ起動）
# - direct:  直接起動（マイグレーションをスキップ）
# - migrate: マイグレーションのみ実行
# - health:  ヘルスチェック実行
# - test:    テスト実行
# - shell:   シェルモード
# =============================================================================

set -euo pipefail

# 環境変数の設定とデフォルト値
export DB_HOST="${DB_HOST:-postgres}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME="${DB_NAME:-monstera}"
export DB_USER="${DB_USER:-postgres}"
export DB_PASSWORD="${DB_PASSWORD:-postgres}"
export DB_DRIVER="${DB_DRIVER:-postgres}"
export DB_SSLMODE="${DB_SSLMODE:-disable}"
export DB_SSL_MODE="${DB_SSL_MODE:-disable}"
export JWT_SECRET="${JWT_SECRET:-devjwtsecret}"
export PORT="${PORT:-8080}"
export CORS_ALLOW_ORIGINS="${CORS_ALLOW_ORIGINS:-http://localhost:3000}"
export GIN_MODE="${GIN_MODE:-debug}"
export GO_ENV="${GO_ENV:-development}"

# ログ出力関数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# エラー出力関数
error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# PostgreSQL接続待機関数
wait_for_postgres() {
    log "PostgreSQL接続待機中..."
    log "接続先: ${DB_DRIVER}://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    
    local max_attempts=60
    local attempt=1
    
    # wait-for-postgres.shが存在する場合は使用
    if [ -f "./wait-for-postgres.sh" ]; then
        log "wait-for-postgres.sh を使用してPostgreSQLを待機"
        ./wait-for-postgres.sh "${DB_HOST}"
        return $?
    fi
    
    # pg_isreadyを使用した待機処理
    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
            log "PostgreSQL接続成功"
            return 0
        fi
        
        log "PostgreSQL接続待機中... (${attempt}/${max_attempts})"
        sleep 2
        ((attempt++))
    done
    
    error "PostgreSQL接続タイムアウト"
    return 1
}

# マイグレーション実行
run_migrations() {
    log "データベースマイグレーション実行..."
    
    # マイグレーションパスの決定
    local migration_path="./migrations/postgresql-versions"
    if [ ! -d "$migration_path" ]; then
        migration_path="./migrations"
    fi
    
    # PostgreSQL接続文字列
    local db_url="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"
    
    # golang-migrateが利用可能か確認
    if command -v migrate &> /dev/null; then
        log "マイグレーションパス: ${migration_path}"
        migrate -path "${migration_path}" -database "${db_url}" up
        log "マイグレーション実行完了"
    else
        error "golang-migrateが見つかりません。マイグレーションをスキップします。"
        return 1
    fi
}

# アプリケーション起動前の準備
prepare_app() {
    log "アプリケーション起動準備..."
    
    # ログディレクトリ作成
    mkdir -p /app/logs
    
    # テンプレートディレクトリ確認
    if [ ! -d "/app/templates" ]; then
        mkdir -p /app/templates
        log "テンプレートディレクトリを作成しました"
    fi
    
    log "環境設定:"
    log "- Environment: ${GO_ENV}"
    log "- GIN Mode: ${GIN_MODE}"
    log "- API Port: ${PORT}"
    log "- CORS Origins: ${CORS_ALLOW_ORIGINS}"
}

# アプリケーション起動
start_app() {
    log "Monstera Backend 起動中..."
    
    # 実行可能ファイルの検索と実行
    if [ -f "/usr/local/bin/monstera-api" ]; then
        log "monstera-api バイナリを実行"
        exec /usr/local/bin/monstera-api
    elif [ -f "/app/monstera-api" ]; then
        log "ローカルバイナリを実行"
        exec /app/monstera-api
    elif [ -f "/app/cmd/server/main.go" ]; then
        # 開発環境用: ソースコードから直接実行
        log "ソースコードから実行 (開発モード)"
        cd /app
        go mod download
        exec go run cmd/server/main.go
    else
        error "実行可能ファイルが見つかりません"
        exit 1
    fi
}

# 直接起動（マイグレーションスキップ）
start_direct() {
    log "直接起動モード（マイグレーションをスキップ）"
    log "警告: データベースが最新の状態であることを確認してください"
    
    prepare_app
    start_app
}

# ヘルスチェック
health_check() {
    log "ヘルスチェック実行..."
    
    # データベース接続確認
    if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
        error "ヘルスチェック失敗: データベース接続不可"
        return 1
    fi
    
    # アプリケーションのヘルスチェック（ポート8080が開いているか確認）
    if command -v nc &> /dev/null; then
        if nc -z localhost "${PORT}" 2>/dev/null; then
            log "ヘルスチェック成功: アプリケーションが稼働中"
        else
            error "ヘルスチェック失敗: アプリケーションポート ${PORT} が応答しません"
            return 1
        fi
    fi
    
    log "ヘルスチェック成功"
    return 0
}

# テスト実行
run_tests() {
    log "テストモード起動"
    
    wait_for_postgres || exit 1
    run_migrations || log "警告: マイグレーション失敗（テストは続行）"
    prepare_app
    
    # テスト実行
    cd /app
    log "Go テスト実行中..."
    go test ./... -v
}

# シグナルハンドラー
cleanup() {
    log "アプリケーション終了処理..."
    exit 0
}

# メイン処理
main() {
    # シグナルハンドラー設定
    trap cleanup SIGTERM SIGINT
    
    # モード表示
    local mode="${1:-start}"
    log "=== Monstera Backend エントリーポイント ==="
    log "モード: ${mode}"
    log "データベース: ${DB_DRIVER}://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    
    # 引数による動作切り替え
    case "${mode}" in
        "start")
            wait_for_postgres || exit 1
            run_migrations || log "警告: マイグレーション失敗（起動は続行）"
            prepare_app
            start_app
            ;;
        "direct")
            start_direct
            ;;
        "migrate")
            wait_for_postgres || exit 1
            run_migrations || exit 1
            log "マイグレーションのみ完了"
            ;;
        "health")
            health_check
            exit $?
            ;;
        "test")
            run_tests
            ;;
        "shell")
            log "シェルモード"
            exec /bin/sh
            ;;
        *)
            error "不明なモード: ${mode}"
            echo "使用方法: $0 [start|direct|migrate|health|test|shell]"
            echo "  start   - 通常起動（DB待機→マイグレーション→起動）"
            echo "  direct  - 直接起動（マイグレーションスキップ）"
            echo "  migrate - マイグレーションのみ実行"
            echo "  health  - ヘルスチェック"
            echo "  test    - テスト実行"
            echo "  shell   - シェルモード"
            exit 1
            ;;
    esac
}

# PostgreSQLクライアントがインストールされているか確認
if ! command -v pg_isready &> /dev/null; then
    log "PostgreSQLクライアントが見つかりません"
    # Dockerイメージ内では通常インストール済みのため、この処理は開発環境用
    if [ "${GO_ENV}" = "development" ] && command -v apt-get &> /dev/null; then
        log "PostgreSQLクライアントをインストール中..."
        apt-get update && apt-get install -y postgresql-client
    fi
fi

# スクリプト実行
main "$@"