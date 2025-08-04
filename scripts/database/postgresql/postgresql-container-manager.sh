#!/bin/bash

# =============================================================================
# Monstera PostgreSQL コンテナ管理スクリプト
# =============================================================================

set -euo pipefail

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.test.yml"
ENV_FILE="${PROJECT_ROOT}/.env.test"

# デフォルト環境変数
export POSTGRES_DB="${POSTGRES_DB:-monstera_test}"
export POSTGRES_USER="${POSTGRES_USER:-monstera}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export PGADMIN_EMAIL="${PGADMIN_EMAIL:-admin@monstera.local}"
export PGADMIN_PASSWORD="${PGADMIN_PASSWORD:-password}"
export PGADMIN_PORT="${PGADMIN_PORT:-8082}"

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 環境ファイル作成
create_env_file() {
    log_info "テスト環境ファイル作成..."
    
    if [ ! -f "${ENV_FILE}" ]; then
        cat > "${ENV_FILE}" << EOF
# Monstera PostgreSQL テスト環境設定

# PostgreSQL設定
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_PORT=${POSTGRES_PORT}

# pgAdmin設定
PGADMIN_EMAIL=${PGADMIN_EMAIL}
PGADMIN_PASSWORD=${PGADMIN_PASSWORD}
PGADMIN_PORT=${PGADMIN_PORT}

# Redis設定
REDIS_TEST_PORT=6380
REDIS_PASSWORD=testpassword

# API設定
API_TEST_PORT=8081
FRONTEND_TEST_PORT=3001

# その他
TZ=Asia/Tokyo
EOF
        log_success "環境ファイル作成完了: ${ENV_FILE}"
    else
        log_info "環境ファイル既存: ${ENV_FILE}"
    fi
}

# PostgreSQLコンテナ起動
start_postgres() {
    log_info "PostgreSQLテストコンテナ起動..."
    
    create_env_file
    
    # PostgreSQLのみ起動
    docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d postgres-test
    
    # ヘルスチェック待機
    log_info "PostgreSQL起動待機中..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres-test pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; then
            log_success "PostgreSQL起動完了"
            return 0
        fi
        
        log_info "PostgreSQL起動待機中... (${attempt}/${max_attempts})"
        sleep 2
        ((attempt++))
    done
    
    log_error "PostgreSQL起動タイムアウト"
    return 1
}

# pgAdmin起動
start_pgadmin() {
    log_info "pgAdmin起動..."
    
    docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" --profile admin up -d pgadmin-test
    
    log_success "pgAdmin起動完了"
    log_info "pgAdmin URL: http://localhost:${PGADMIN_PORT}"
    log_info "pgAdmin Email: ${PGADMIN_EMAIL}"
    log_info "pgAdmin Password: ${PGADMIN_PASSWORD}"
}

# 全サービス起動
start_all() {
    log_info "全テストサービス起動..."
    
    create_env_file
    
    # 全プロファイル有効でサービス起動
    docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" --profile admin --profile backend --profile frontend --profile test up -d
    
    # PostgreSQL起動待機
    log_info "PostgreSQL起動待機中..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres-test pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; then
            log_success "PostgreSQL起動完了"
            break
        fi
        
        log_info "PostgreSQL起動待機中... (${attempt}/${max_attempts})"
        sleep 2
        ((attempt++))
    done
    
    log_success "全サービス起動完了"
    
    # アクセス情報表示
    show_service_info
}

# サービス停止
stop_services() {
    log_info "テストサービス停止..."
    
    docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down
    
    log_success "サービス停止完了"
}

# データボリューム削除
clean_volumes() {
    log_warning "データボリュームを削除します。この操作は元に戻せません。"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "データボリューム削除..."
        
        # サービス停止
        docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down -v
        
        # 明示的にボリューム削除
        docker volume rm -f monstera_postgres_test_data 2>/dev/null || true
        docker volume rm -f monstera_pgadmin_test_data 2>/dev/null || true
        docker volume rm -f monstera_redis_test_data 2>/dev/null || true
        docker volume rm -f monstera_test_results 2>/dev/null || true
        
        log_success "データボリューム削除完了"
    else
        log_info "データボリューム削除をキャンセルしました"
    fi
}

# サービス状態確認
status_services() {
    log_info "テストサービス状態確認..."
    
    # Docker Composeサービス状態
    docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps
    
    echo ""
    
    # PostgreSQL接続テスト
    if docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres-test pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; then
        log_success "PostgreSQL: 接続可能"
        
        # データベース統計情報取得
        local db_size=$(docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres-test psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c "SELECT pg_size_pretty(pg_database_size('${POSTGRES_DB}'));" | tr -d ' ')
        local connection_count=$(docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres-test psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}';" | tr -d ' ')
        
        log_info "  データベースサイズ: ${db_size}"
        log_info "  接続数: ${connection_count}"
    else
        log_error "PostgreSQL: 接続不可"
    fi
    
    echo ""
    show_service_info
}

# サービス情報表示
show_service_info() {
    log_info "=== サービスアクセス情報 ==="
    echo ""
    echo "📊 pgAdmin (PostgreSQL管理):"
    echo "   URL: http://localhost:${PGADMIN_PORT}"
    echo "   Email: ${PGADMIN_EMAIL}"
    echo "   Password: ${PGADMIN_PASSWORD}"
    echo ""
    echo "🗄️  PostgreSQL (直接接続):"
    echo "   Host: localhost"
    echo "   Port: ${POSTGRES_PORT}"
    echo "   Database: ${POSTGRES_DB}"
    echo "   User: ${POSTGRES_USER}"
    echo "   Password: ${POSTGRES_PASSWORD}"
    echo ""
    echo "🔧 接続文字列:"
    echo "   postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=disable"
    echo ""
    echo "🚀 API Server: http://localhost:8081 (※backend起動時)"
    echo "🌐 Frontend: http://localhost:3001 (※frontend起動時)"
    echo ""
}

# ログ表示
show_logs() {
    local service="${1:-postgres-test}"
    
    log_info "${service} ログ表示..."
    docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs -f "${service}"
}

# テストデータ投入
insert_test_data() {
    log_info "テストデータ投入..."
    
    # PostgreSQL起動確認
    if ! docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres-test pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; then
        log_error "PostgreSQLが起動していません"
        return 1
    fi
    
    # テストデータ投入スクリプト実行
    "${SCRIPT_DIR}/test-data-insert.sh" insert
}

# PostgreSQLコンソール接続
connect_psql() {
    log_info "PostgreSQLコンソール接続..."
    
    docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec postgres-test psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
}

# パフォーマンステスト実行
run_performance_test() {
    log_info "パフォーマンステスト実行..."
    
    # PostgreSQL起動確認
    if ! docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres-test pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; then
        log_error "PostgreSQLが起動していません"
        return 1
    fi
    
    # パフォーマンステストデータ生成
    "${SCRIPT_DIR}/test-data-insert.sh" performance
    
    # シンプルなパフォーマンステスト実行
    log_info "クエリパフォーマンステスト実行..."
    
    cat > "${PROJECT_ROOT}/test-data/performance_test_queries.sql" << 'EOF'
-- パフォーマンステスト用クエリ

-- 1. ユーザー一覧取得テスト
\timing on
SELECT id, name, email, role FROM users WHERE is_active = true ORDER BY created_at DESC LIMIT 100;

-- 2. 週報検索テスト
SELECT wr.id, wr.start_date, wr.end_date, wr.status, u.name 
FROM weekly_reports wr 
JOIN users u ON wr.user_id = u.id 
WHERE wr.start_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY wr.start_date DESC;

-- 3. 提案統計テスト
SELECT 
    status,
    COUNT(*) as count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM engineer_proposals 
GROUP BY status;

-- 4. 複雑なJOINテスト
SELECT 
    u.name,
    COUNT(wr.id) as report_count,
    COALESCE(SUM(wr.total_work_hours), 0) as total_hours
FROM users u
LEFT JOIN weekly_reports wr ON u.id = wr.user_id 
    AND wr.start_date >= CURRENT_DATE - INTERVAL '90 days'
WHERE u.is_active = true
GROUP BY u.id, u.name
ORDER BY total_hours DESC;

\timing off
EOF
    
    # パフォーマンステスト実行
    docker-compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -i postgres-test psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${PROJECT_ROOT}/test-data/performance_test_queries.sql"
    
    log_success "パフォーマンステスト完了"
}

# ヘルプ表示
show_help() {
    echo "PostgreSQL テストコンテナ管理スクリプト"
    echo ""
    echo "使用方法: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start           PostgreSQLのみ起動"
    echo "  start-pgadmin   pgAdmin起動"
    echo "  start-all       全サービス起動"
    echo "  stop            サービス停止"
    echo "  restart         サービス再起動"
    echo "  status          サービス状態確認"
    echo "  logs [service]  ログ表示"
    echo "  psql            PostgreSQLコンソール接続"
    echo "  insert-data     テストデータ投入"
    echo "  performance     パフォーマンステスト実行"
    echo "  clean           データボリューム削除"
    echo "  info            サービス情報表示"
    echo "  help            ヘルプ表示"
    echo ""
    echo "Examples:"
    echo "  $0 start          # PostgreSQL起動"
    echo "  $0 start-all      # 全サービス起動"
    echo "  $0 logs postgres  # PostgreSQLログ表示"
    echo "  $0 psql           # PostgreSQL接続"
    echo "  $0 insert-data    # テストデータ投入"
}

# メイン処理
main() {
    local command="${1:-help}"
    
    case "${command}" in
        "start")
            start_postgres
            ;;
        "start-pgadmin")
            start_pgadmin
            ;;
        "start-all")
            start_all
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            start_postgres
            ;;
        "status")
            status_services
            ;;
        "logs")
            show_logs "${2:-postgres-test}"
            ;;
        "psql")
            connect_psql
            ;;
        "insert-data")
            insert_test_data
            ;;
        "performance")
            run_performance_test
            ;;
        "clean")
            clean_volumes
            ;;
        "info")
            show_service_info
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "不正なコマンド: ${command}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"