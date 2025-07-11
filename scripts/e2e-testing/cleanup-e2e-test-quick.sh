#!/bin/bash

# =============================================================================
# Quick E2E Test Cleanup Script
# =============================================================================
# 軽量版：最小限のクリーンアップを高速実行します

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
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

cd "$(dirname "${BASH_SOURCE[0]}")"

log "=== Quick E2E Cleanup ==="

# 1. Redis クリア
if docker-compose ps | grep -q "redis.*Up"; then
    docker-compose exec redis redis-cli FLUSHALL > /dev/null 2>&1 || true
    success "Redis cleared"
else
    warning "Redis not running"
fi

# 2. セッションクリア
if docker-compose ps | grep -q "mysql.*Up"; then
    docker-compose exec mysql mysql -u root -proot monstera -e "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_test@duesk.co.jp');" 2>/dev/null || true
    success "Sessions cleared"
else
    warning "MySQL not running"
fi

# 3. 一時ファイル削除
rm -rf /tmp/e2e-uploads/* 2>/dev/null || true
rm -rf frontend/downloads/* 2>/dev/null || true
success "Temp files cleared"

# 4. キャッシュクリア
rm -rf frontend/node_modules/.cache/* 2>/dev/null || true
rm -rf frontend/.next 2>/dev/null || true
success "Caches cleared"

# 5. 環境変数リセット
unset NODE_ENV E2E_MODE PLAYWRIGHT_HEADLESS 2>/dev/null || true
export NODE_ENV=development
success "Environment reset"

# 6. プロセス確認
PLAYWRIGHT_PIDS=$(pgrep -f "playwright" 2>/dev/null || true)
CHROMIUM_PIDS=$(pgrep -f "chromium\|chrome.*--headless" 2>/dev/null || true)

if [ -n "$PLAYWRIGHT_PIDS" ] || [ -n "$CHROMIUM_PIDS" ]; then
    warning "Test processes still running. Use 'cleanup-e2e-test.sh --force' to terminate."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Quick Cleanup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# サービス状態
echo -n "Services: "
if docker-compose ps | grep -q "mysql.*Up.*redis.*Up.*backend.*Up"; then
    echo -e "${GREEN}✅ Running${NC}"
elif docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️ Partially Running${NC}"
else
    echo -e "${RED}❌ Stopped${NC}"
fi

echo -n "Frontend: "
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ready${NC}"
else
    echo -e "${YELLOW}⚠️ Not accessible${NC}"
fi

echo ""
echo "Commands:"
echo "  ./setup-e2e-test-quick.sh    # Quick setup for next test"
echo "  ./cleanup-e2e-test.sh        # Full cleanup with options"
echo "  docker-compose down           # Stop all services"
echo ""

success "Ready for next test cycle!"