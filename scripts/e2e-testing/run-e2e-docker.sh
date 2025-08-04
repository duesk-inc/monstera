#!/bin/bash

# =============================================================================
# E2E Test Docker Execution Script
# =============================================================================
# このスクリプトはDocker環境でE2Eテストを実行するための統合スクリプトです
# docker-compose.e2e.ymlを使用して、完全に隔離されたテスト環境を構築します

set -e  # エラーが発生したら即座に終了

# カラー出力の定義
if [ -t 1 ] && [ -z "$CI" ]; then
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    PURPLE='\033[0;35m'
    NC='\033[0m' # No Color
else
    # CI環境またはパイプ出力時は色なし
    GREEN=''
    RED=''
    YELLOW=''
    BLUE=''
    PURPLE=''
    NC=''
fi

# タイムスタンプ付きログ出力
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

info() {
    echo -e "${PURPLE}ℹ️${NC} $1"
}

# スクリプトのルートディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 引数処理
COMMAND=${1:-test}
KEEP_RUNNING=${2:-false}

# ヘルプ表示
show_help() {
    echo "Usage: $0 [COMMAND] [KEEP_RUNNING]"
    echo ""
    echo "Commands:"
    echo "  test      Run E2E tests (default)"
    echo "  up        Start E2E environment"
    echo "  down      Stop and remove E2E environment"
    echo "  logs      Show logs"
    echo "  clean     Clean up all E2E data"
    echo "  shell     Open shell in test runner"
    echo "  help      Show this help"
    echo ""
    echo "Options:"
    echo "  KEEP_RUNNING  Keep environment running after tests (true/false, default: false)"
}

# E2E環境の起動
start_e2e_env() {
    log "Starting E2E test environment..."
    
    cd "$PROJECT_ROOT"
    
    # 既存の環境をクリーンアップ
    docker-compose -f docker-compose.e2e.yml down -v 2>/dev/null || true
    
    # E2E環境を起動
    docker-compose -f docker-compose.e2e.yml up -d
    
    # ヘルスチェック
    log "Waiting for services to be healthy..."
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f docker-compose.e2e.yml ps | grep -E "(healthy|running)" | grep -q "frontend-e2e.*healthy" && \
           docker-compose -f docker-compose.e2e.yml ps | grep -E "(healthy|running)" | grep -q "backend-e2e.*healthy"; then
            success "All services are healthy!"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Services failed to become healthy"
        docker-compose -f docker-compose.e2e.yml logs
        return 1
    fi
    
    echo ""
    info "E2E environment is ready:"
    info "  Frontend: http://localhost:3001"
    info "  Backend API: http://localhost:8081"
    info "  PostgreSQL: localhost:5433"
    info "  Redis: localhost:6380"
    info "  認証: スキップモード（開発用ユーザー）"
}

# E2Eテストの実行
run_e2e_tests() {
    log "Running E2E tests..."
    
    cd "$PROJECT_ROOT"
    
    # テスト実行
    if [ "$CI" = "true" ]; then
        # CI環境ではコンテナ内で実行
        docker-compose -f docker-compose.e2e.yml run --rm e2e-runner npm run test:e2e
    else
        # ローカル環境ではホストから実行
        cd "$PROJECT_ROOT/frontend"
        npm run test:e2e
    fi
    
    local test_result=$?
    
    if [ $test_result -eq 0 ]; then
        success "E2E tests passed!"
    else
        error "E2E tests failed!"
    fi
    
    return $test_result
}

# E2E環境の停止
stop_e2e_env() {
    log "Stopping E2E test environment..."
    
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.e2e.yml down
    
    success "E2E environment stopped"
}

# E2E環境のクリーンアップ
clean_e2e_env() {
    log "Cleaning up E2E test environment..."
    
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.e2e.yml down -v
    
    # テスト結果のクリーンアップ
    rm -rf "$PROJECT_ROOT/test-results"
    rm -rf "$PROJECT_ROOT/playwright-report"
    rm -rf "$PROJECT_ROOT/coverage"
    
    success "E2E environment cleaned up"
}

# ログの表示
show_logs() {
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.e2e.yml logs -f
}

# テストランナーのシェル
open_shell() {
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.e2e.yml run --rm e2e-runner /bin/bash
}

# メイン処理
main() {
    case "$COMMAND" in
        test)
            start_e2e_env
            run_e2e_tests
            local test_result=$?
            
            if [ "$KEEP_RUNNING" != "true" ]; then
                stop_e2e_env
            else
                info "E2E environment is still running. Use '$0 down' to stop."
            fi
            
            exit $test_result
            ;;
        up)
            start_e2e_env
            ;;
        down)
            stop_e2e_env
            ;;
        logs)
            show_logs
            ;;
        clean)
            clean_e2e_env
            ;;
        shell)
            open_shell
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# 実行
main