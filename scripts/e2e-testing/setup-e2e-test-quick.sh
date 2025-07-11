#!/bin/bash

# =============================================================================
# Quick E2E Test Setup Script
# =============================================================================
# 軽量版：最小限の設定でE2Eテスト実行環境を準備します

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

log "=== Quick E2E Setup ==="

# 1. 環境設定読み込み
if [ -f ".env.e2e" ]; then
    source .env.e2e
    success "Environment loaded"
else
    error ".env.e2e not found"
    exit 1
fi

# 2. 必要ディレクトリ作成
mkdir -p test-results playwright-report coverage
success "Directories created"

# 3. Redis クリア
if docker-compose ps | grep -q "redis.*Up"; then
    docker-compose exec redis redis-cli FLUSHALL > /dev/null
    success "Redis cleared"
fi

# 4. 既存セッションクリア
docker-compose exec mysql mysql -u root -proot monstera -e "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%_test@duesk.co.jp');" 2>/dev/null || true
success "Sessions cleared"

# 5. 基本テストユーザー確認
USER_COUNT=$(docker-compose exec mysql mysql -u root -proot monstera -N -e "SELECT COUNT(*) FROM users WHERE email LIKE '%_test@duesk.co.jp';" 2>/dev/null | tail -1 | tr -d '\r')

if [ "$USER_COUNT" -ge "3" ]; then
    success "Test users ready: $USER_COUNT"
else
    warning "Creating basic test users..."
    
    # 最小限のテストユーザー作成
    docker-compose exec mysql mysql -u root -proot monstera << EOF 2>/dev/null || true
INSERT IGNORE INTO users (
    id, email, password, first_name, last_name, first_name_kana, last_name_kana,
    role, active, created_at, updated_at
) VALUES 
(
    'e2e00001-0000-0000-0000-000000000001',
    'engineer_test@duesk.co.jp',
    '\$2a\$10\$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', 'エンジニア', 'テスト', 'エンジニア',
    4, 1, NOW(), NOW()
),
(
    'e2e00001-0000-0000-0000-000000000002',
    'sales_test@duesk.co.jp',
    '\$2a\$10\$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', '営業', 'テスト', 'エイギョウ',
    4, 1, NOW(), NOW()
),
(
    'e2e00001-0000-0000-0000-000000000003',
    'manager_test@duesk.co.jp',
    '\$2a\$10\$JLVcXydvp3XKpqK3TdbUGOYJ1KiXRZGBKLhXBFZQKhJSLHvQHJCLy',
    'テスト', 'マネージャー', 'テスト', 'マネージャー',
    3, 1, NOW(), NOW()
);
EOF
    
    success "Basic test users created"
fi

# 6. 環境変数設定
export NODE_ENV=test
export E2E_MODE=true
export PLAYWRIGHT_HEADLESS=${CI:-false}

# 7. 最終確認
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Quick E2E Setup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# サービス状態
echo -n "Backend:  "
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ready${NC}"
else
    echo -e "${YELLOW}⚠️ Check required${NC}"
fi

echo -n "Frontend: "
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ready${NC}"
else
    echo -e "${YELLOW}⚠️ Start with: cd frontend && npm run dev${NC}"
fi

echo ""
echo "Test Commands:"
echo "  npm run test:e2e                 # Run all tests"
echo "  npm run test:e2e:ui               # Run with UI"
echo "  npm run test:e2e -- --headed      # Run with browser visible"
echo ""

success "Quick setup complete! Ready for E2E testing."