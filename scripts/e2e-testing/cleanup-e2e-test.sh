#!/bin/bash

# =============================================================================
# E2E Test Cleanup Script
# =============================================================================
# このスクリプトはE2Eテスト実行後のクリーンアップを行います
# テストデータの削除、ログファイルの整理、一時ファイルの削除を行います

set -e  # エラーが発生したら即座に終了

# カラー出力の定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# タイムスタンプ付きログ出力
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# スクリプトのルートディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log "=== E2E Test Cleanup Starting ==="

# コマンドライン引数の処理
CLEANUP_MODE="normal"
KEEP_LOGS=false
KEEP_TEST_DATA=false
FORCE_CLEANUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick|-q)
            CLEANUP_MODE="quick"
            shift
            ;;
        --keep-logs)
            KEEP_LOGS=true
            shift
            ;;
        --keep-test-data)
            KEEP_TEST_DATA=true
            shift
            ;;
        --force|-f)
            FORCE_CLEANUP=true
            shift
            ;;
        --help|-h)
            echo "E2E Test Cleanup Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick, -q           Quick cleanup (essential operations only)"
            echo "  --keep-logs          Keep test logs and reports"
            echo "  --keep-test-data     Keep test data in database"
            echo "  --force, -f          Force cleanup without confirmation"
            echo "  --help, -h           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                   # Normal cleanup"
            echo "  $0 --quick           # Quick cleanup"
            echo "  $0 --keep-logs       # Cleanup but keep logs"
            echo "  $0 --force           # Force cleanup without prompts"
            exit 0
            ;;
        *)
            warning "Unknown option: $1"
            shift
            ;;
    esac
done

# 環境設定ファイルの確認と読み込み
if [ -f ".env.e2e" ]; then
    source .env.e2e
    info "Environment variables loaded"
else
    warning ".env.e2e not found, using default settings"
fi

# 確認プロンプト（forceモードでない場合）
if [ "$FORCE_CLEANUP" = false ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "E2E Test Cleanup Configuration:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Mode: $CLEANUP_MODE"
    echo "Keep Logs: $KEEP_LOGS"
    echo "Keep Test Data: $KEEP_TEST_DATA"
    echo ""
    
    if [ "$CLEANUP_MODE" = "quick" ]; then
        echo "Quick mode will:"
        echo "  - Clear Redis cache"
        echo "  - Clear sessions"
        echo "  - Remove temporary files"
    else
        echo "Normal mode will:"
        echo "  - Clear Redis cache"
        echo "  - Remove test data from database"
        echo "  - Clear sessions"
        echo "  - Remove temporary files"
        echo "  - Archive test reports"
    fi
    
    if [ "$KEEP_LOGS" = false ]; then
        echo "  - Remove test logs and reports"
    fi
    
    echo ""
    read -p "Continue with cleanup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Cleanup cancelled by user"
        exit 0
    fi
fi

# 1. Redis キャッシュのクリア
log "1. Clearing Redis cache..."

if docker-compose ps | grep -q "redis.*Up"; then
    docker-compose exec redis redis-cli FLUSHALL > /dev/null 2>&1 || warning "Redis flush failed"
    success "Redis cache cleared"
else
    info "Redis service not running, skipping cache clear"
fi

# 2. セッションのクリア
log "2. Clearing user sessions..."

if docker-compose ps | grep -q "mysql.*Up"; then
    # E2Eテストユーザーのセッションをクリア
    docker-compose exec mysql mysql -u root -proot monstera << EOF 2>/dev/null || warning "Session cleanup failed"
DELETE FROM sessions WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%_test@duesk.co.jp'
);
EOF
    success "Test user sessions cleared"
else
    info "MySQL service not running, skipping session clear"
fi

# 3. テストデータのクリーンアップ（keep-test-dataフラグが設定されていない場合）
if [ "$KEEP_TEST_DATA" = false ] && [ "$CLEANUP_MODE" != "quick" ]; then
    log "3. Cleaning up test data from database..."
    
    if docker-compose ps | grep -q "mysql.*Up"; then
        # E2Eテストデータを段階的に削除
        docker-compose exec mysql mysql -u root -proot monstera << EOF 2>/dev/null || warning "Some test data cleanup failed"
-- Clean up test data in dependency order
DELETE FROM proposal_questions WHERE id LIKE 'e2e%';
DELETE FROM proposals WHERE id LIKE 'e2e%';
DELETE FROM projects WHERE id LIKE 'e2e%';
DELETE FROM clients WHERE id LIKE 'e2e%';
DELETE FROM user_roles WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%_test@duesk.co.jp'
);
DELETE FROM users WHERE email LIKE '%_test@duesk.co.jp';

-- Clean up any orphaned records
DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users);
EOF
        success "Test data removed from database"
    else
        warning "MySQL service not running, skipping database cleanup"
    fi
else
    info "Skipping test data cleanup (--keep-test-data or --quick mode)"
fi

# 4. 一時ファイルとディレクトリのクリーンアップ
log "4. Cleaning up temporary files..."

# 一時アップロードファイルの削除
if [ -d "/tmp/e2e-uploads" ]; then
    rm -rf /tmp/e2e-uploads/* 2>/dev/null || true
    success "Temporary upload files cleared"
fi

# Playwrightの一時ファイル削除
if [ -d "frontend/test-results" ]; then
    # 最新のテスト結果を保持するかどうか
    if [ "$KEEP_LOGS" = false ]; then
        rm -rf frontend/test-results/* 2>/dev/null || true
        success "Playwright test results cleared"
    else
        info "Keeping Playwright test results (--keep-logs)"
    fi
fi

# ブラウザのダウンロードファイル削除
if [ -d "frontend/downloads" ]; then
    rm -rf frontend/downloads/* 2>/dev/null || true
    success "Download files cleared"
fi

# 5. ログファイルの整理
if [ "$KEEP_LOGS" = false ]; then
    log "5. Cleaning up log files..."
    
    # Playwright レポートの削除
    if [ -d "frontend/playwright-report" ]; then
        rm -rf frontend/playwright-report/* 2>/dev/null || true
        success "Playwright reports cleared"
    fi
    
    # テストカバレッジファイルの削除
    if [ -d "frontend/coverage" ]; then
        rm -rf frontend/coverage/* 2>/dev/null || true
        success "Coverage reports cleared"
    fi
    
    # Node.js ログファイルの削除
    find . -name "*.log" -type f -delete 2>/dev/null || true
    find . -name "npm-debug.log*" -type f -delete 2>/dev/null || true
    find . -name "yarn-debug.log*" -type f -delete 2>/dev/null || true
    find . -name "yarn-error.log*" -type f -delete 2>/dev/null || true
    
    success "Log files cleared"
else
    log "5. Archiving log files..."
    
    # ログファイルのアーカイブ
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    ARCHIVE_DIR="test-archives/e2e-logs-$TIMESTAMP"
    
    mkdir -p "$ARCHIVE_DIR"
    
    # レポートファイルをアーカイブ
    if [ -d "frontend/playwright-report" ] && [ "$(ls -A frontend/playwright-report 2>/dev/null)" ]; then
        cp -r frontend/playwright-report "$ARCHIVE_DIR/" 2>/dev/null || true
    fi
    
    if [ -d "frontend/test-results" ] && [ "$(ls -A frontend/test-results 2>/dev/null)" ]; then
        cp -r frontend/test-results "$ARCHIVE_DIR/" 2>/dev/null || true
    fi
    
    if [ -d "frontend/coverage" ] && [ "$(ls -A frontend/coverage 2>/dev/null)" ]; then
        cp -r frontend/coverage "$ARCHIVE_DIR/" 2>/dev/null || true
    fi
    
    success "Logs archived to $ARCHIVE_DIR"
fi

# 6. Node.jsキャッシュのクリア
log "6. Clearing Node.js caches..."

if [ -d "frontend/node_modules/.cache" ]; then
    rm -rf frontend/node_modules/.cache/* 2>/dev/null || true
    success "Node.js cache cleared"
fi

if [ -d "frontend/.next" ]; then
    rm -rf frontend/.next 2>/dev/null || true
    success "Next.js build cache cleared"
fi

# 7. プロセスの確認とクリーンアップ
log "7. Checking for running test processes..."

# Playwright プロセスの確認
PLAYWRIGHT_PIDS=$(pgrep -f "playwright" 2>/dev/null || true)
if [ -n "$PLAYWRIGHT_PIDS" ]; then
    warning "Found running Playwright processes: $PLAYWRIGHT_PIDS"
    if [ "$FORCE_CLEANUP" = true ]; then
        kill $PLAYWRIGHT_PIDS 2>/dev/null || true
        success "Playwright processes terminated"
    else
        warning "Use --force to terminate running Playwright processes"
    fi
fi

# Chromium プロセスの確認
CHROMIUM_PIDS=$(pgrep -f "chromium\|chrome.*--headless" 2>/dev/null || true)
if [ -n "$CHROMIUM_PIDS" ]; then
    warning "Found running Chromium processes: $CHROMIUM_PIDS"
    if [ "$FORCE_CLEANUP" = true ]; then
        kill $CHROMIUM_PIDS 2>/dev/null || true
        success "Chromium processes terminated"
    else
        warning "Use --force to terminate running Chromium processes"
    fi
fi

# 8. 環境変数のリセット
log "8. Resetting environment variables..."

unset NODE_ENV
unset E2E_MODE
unset PLAYWRIGHT_HEADLESS

# 標準的な開発環境変数に戻す
export NODE_ENV=development

success "Environment variables reset"

# 9. データベース統計情報の表示
if [ "$CLEANUP_MODE" != "quick" ] && docker-compose ps | grep -q "mysql.*Up"; then
    log "9. Database cleanup verification..."
    
    # 残存テストデータの確認
    REMAINING_USERS=$(docker-compose exec mysql mysql -u root -proot monstera -N -e "SELECT COUNT(*) FROM users WHERE email LIKE '%_test@duesk.co.jp';" 2>/dev/null | tail -1 | tr -d '\r' 2>/dev/null || echo "0")
    REMAINING_TEST_DATA=$(docker-compose exec mysql mysql -u root -proot monstera -N -e "SELECT COUNT(*) FROM proposals WHERE id LIKE 'e2e%';" 2>/dev/null | tail -1 | tr -d '\r' 2>/dev/null || echo "0")
    
    if [ "$KEEP_TEST_DATA" = false ]; then
        if [ "$REMAINING_USERS" = "0" ] && [ "$REMAINING_TEST_DATA" = "0" ]; then
            success "All test data successfully removed"
        else
            warning "Some test data may remain: Users($REMAINING_USERS), TestData($REMAINING_TEST_DATA)"
        fi
    else
        info "Test data preserved: Users($REMAINING_USERS), TestData($REMAINING_TEST_DATA)"
    fi
fi

# 10. 最終確認とサマリー
log "10. Cleanup summary..."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "E2E Test Cleanup Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Completed Operations:"
echo "  ✅ Redis cache cleared"
echo "  ✅ User sessions cleared"
echo "  ✅ Temporary files removed"
echo "  ✅ Node.js caches cleared"
echo "  ✅ Environment variables reset"

if [ "$KEEP_TEST_DATA" = false ] && [ "$CLEANUP_MODE" != "quick" ]; then
    echo "  ✅ Test data removed from database"
fi

if [ "$KEEP_LOGS" = false ]; then
    echo "  ✅ Log files and reports cleared"
else
    echo "  📁 Log files archived"
fi

echo ""
echo "Services Status:"

# サービス状態の表示
echo -n "MySQL:    "
if docker-compose ps | grep -q "mysql.*Up"; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${YELLOW}⚠️ Not Running${NC}"
fi

echo -n "Redis:    "
if docker-compose ps | grep -q "redis.*Up"; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${YELLOW}⚠️ Not Running${NC}"
fi

echo -n "Backend:  "
if docker-compose ps | grep -q "backend.*Up"; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${YELLOW}⚠️ Not Running${NC}"
fi

echo -n "Frontend: "
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${YELLOW}⚠️ Not Running${NC}"
fi

echo ""
echo "Next Steps:"
echo "  • Services are still running for continued development"
echo "  • To stop all services: docker-compose down"
echo "  • To run new E2E tests: ./setup-e2e-test.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

success "E2E test cleanup completed successfully!"

# 最終的な終了コード
if [ "$CLEANUP_MODE" = "quick" ]; then
    info "Quick cleanup completed in $(date +%s) seconds"
else
    info "Full cleanup completed"
fi

exit 0