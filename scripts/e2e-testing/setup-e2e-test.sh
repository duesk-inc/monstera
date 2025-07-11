#!/bin/bash

# =============================================================================
# E2E Test Setup Script
# =============================================================================
# このスクリプトはE2Eテスト実行前の環境準備を行います
# 実行前に必要なサービスの起動、データベースの初期化、テストデータの投入を行います

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

# スクリプトのルートディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log "=== E2E Test Environment Setup Starting ==="

# 1. 環境設定ファイルの確認
log "1. Checking environment configuration files..."

if [ ! -f ".env.e2e" ]; then
    error ".env.e2e file not found!"
    exit 1
fi

# 環境変数の読み込み
source .env.e2e
success "Environment variables loaded from .env.e2e"

# 2. 必要なディレクトリの作成
log "2. Creating required directories..."

mkdir -p test-results
mkdir -p playwright-report
mkdir -p coverage
mkdir -p /tmp/e2e-uploads

success "Test directories created"

# 3. Docker サービスの確認と起動
log "3. Checking Docker services..."

# Docker Composeが実行可能か確認
if ! command -v docker-compose &> /dev/null; then
    error "docker-compose command not found!"
    exit 1
fi

# MySQLの起動確認
if ! docker-compose ps | grep -q "mysql.*Up"; then
    log "Starting MySQL service..."
    docker-compose up -d mysql
    
    # MySQLの起動を待機
    log "Waiting for MySQL to be ready..."
    for i in {1..30}; do
        if docker-compose exec mysql mysqladmin ping -h localhost -u root -proot &> /dev/null; then
            success "MySQL is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    if [ $i -eq 30 ]; then
        error "MySQL failed to start within 60 seconds"
        exit 1
    fi
else
    success "MySQL is already running"
fi

# Redisの起動確認
if ! docker-compose ps | grep -q "redis.*Up"; then
    log "Starting Redis service..."
    docker-compose up -d redis
    sleep 5
    success "Redis started"
else
    success "Redis is already running"
fi

# Backendの起動確認
if ! docker-compose ps | grep -q "backend.*Up"; then
    log "Starting Backend service..."
    docker-compose up -d backend
    
    # Backendの起動を待機
    log "Waiting for Backend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:8080/api/v1/health &> /dev/null; then
            success "Backend is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    if [ $i -eq 30 ]; then
        warning "Backend health check failed, but continuing..."
    fi
else
    success "Backend is already running"
fi

# 4. データベースのクリーンアップ
log "4. Cleaning up test database..."

# E2Eテストデータのクリーンアップ
docker-compose exec -T mysql mysql -u root -proot monstera << EOF 2>&1 | grep -v "Warning" || true
-- Clean up existing E2E test data
DELETE FROM proposal_questions WHERE id LIKE 'e2e%';
DELETE FROM proposals WHERE id LIKE 'e2e%';
DELETE FROM projects WHERE id LIKE 'e2e%';
DELETE FROM clients WHERE id LIKE 'e2e%';
DELETE FROM sessions WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%_test@duesk.co.jp'
);
DELETE FROM users WHERE email LIKE '%_test@duesk.co.jp';
EOF

success "Test data cleaned up"

# 5. テストデータの投入
log "5. Seeding test data..."

# E2Eテスト用シードデータの投入
if [ -f "backend/seeds/e2e-test-seed.sql" ]; then
    log "Loading E2E test seed data..."
    # SQLエラーを無視して続行（一部のエラーは既存データとの競合の可能性）
    docker-compose exec -T mysql mysql -u root -proot monstera < backend/seeds/e2e-test-seed.sql 2>/dev/null || log "Some SQL statements may have failed (expected for duplicate data)"
    success "Test seed data processed"
else
    warning "E2E test seed file not found at backend/seeds/e2e-test-seed.sql"
fi

# 追加のテストデータファイルは必要に応じて個別実行
# メインのシードファイルに全データが含まれているため、追加実行はスキップ

# 6. Redisのクリア
log "6. Clearing Redis cache..."

docker-compose exec redis redis-cli FLUSHALL > /dev/null
success "Redis cache cleared"

# 7. テストデータの検証
log "7. Verifying test data..."

# テストユーザーの確認
USER_COUNT=$(docker-compose exec mysql mysql -u root -proot monstera -N -e "SELECT COUNT(*) FROM users WHERE email LIKE '%_test@duesk.co.jp';" 2>&1 | grep -v "Warning" | tail -1 | tr -d '\r')

if [ "$USER_COUNT" -ge "3" ]; then
    success "Test users created: $USER_COUNT users"
else
    error "Test users not created properly. Found: $USER_COUNT users"
    exit 1
fi

# テスト提案データの確認
PROPOSAL_COUNT=$(docker-compose exec mysql mysql -u root -proot monstera -N -e "SELECT COUNT(*) FROM proposals WHERE id LIKE 'e2e%';" 2>&1 | grep -v "Warning" | tail -1 | tr -d '\r' || echo "0")

if [ "$PROPOSAL_COUNT" -ge "5" ]; then
    success "Test proposals created: $PROPOSAL_COUNT proposals"
else
    warning "Expected 5 proposals, found: $PROPOSAL_COUNT"
fi

# 8. フロントエンドの準備
log "8. Preparing frontend..."

# フロントエンドが起動しているか確認
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    warning "Frontend is not running on port 3001"
    log "Please start the frontend manually with: cd frontend && npm run dev"
else
    success "Frontend is accessible on port 3001"
fi

# 9. 環境変数の設定
log "9. Setting up environment variables..."

# E2E用環境変数をエクスポート
export NODE_ENV=test
export E2E_MODE=true
export PLAYWRIGHT_HEADLESS=${CI:-false}

success "Environment variables set"

# 10. テスト実行準備の最終確認
log "10. Final verification..."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "E2E Test Environment Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# サービス状態の表示
echo -n "MySQL:    "
if docker-compose ps | grep -q "mysql.*Up"; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not Running${NC}"
fi

echo -n "Redis:    "
if docker-compose ps | grep -q "redis.*Up"; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not Running${NC}"
fi

echo -n "Backend:  "
if docker-compose ps | grep -q "backend.*Up"; then
    echo -e "${GREEN}✅ Running${NC} (http://localhost:8080)"
else
    echo -e "${RED}❌ Not Running${NC}"
fi

echo -n "Frontend: "
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC} (http://localhost:3001)"
else
    echo -e "${YELLOW}⚠️  Not Running${NC} (Start manually)"
fi

echo ""
echo "Test Data:"
echo "  - Test Users: $USER_COUNT"
echo "  - Test Proposals: $PROPOSAL_COUNT"
echo "  - Redis: Cleared"
echo ""

# テストユーザー情報の表示
echo "Test Users:"
docker-compose exec mysql mysql -u root -proot monstera -e "
    SELECT email, role, 'Password: Test1234!' as password
    FROM users 
    WHERE email LIKE '%_test@duesk.co.jp'
    ORDER BY email;
" 2>&1 | grep -v "Warning" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 最終メッセージ
if [ "$USER_COUNT" -ge "3" ]; then
    success "E2E test environment is ready!"
    echo ""
    echo "To run E2E tests:"
    echo "  cd frontend && npm run test:e2e"
    echo ""
    echo "To run specific test:"
    echo "  cd frontend && npm run test:e2e -- login-requirement-test.spec.ts"
    echo ""
    echo "To run with UI mode:"
    echo "  cd frontend && npm run test:e2e:ui"
    exit 0
else
    error "E2E test environment setup failed!"
    echo "Please check the errors above and try again."
    exit 1
fi