#!/bin/bash

echo "=== E2E Test Environment Verification ==="
echo ""

# カラー出力の定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 検証関数
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2: Found"
        return 0
    else
        echo -e "${RED}❌${NC} $2: Not Found"
        return 1
    fi
}

check_env_var() {
    local var_name=$1
    local var_value=$2
    local expected=$3
    
    if [ "$var_value" = "$expected" ]; then
        echo -e "${GREEN}✅${NC} $var_name: $var_value"
    else
        echo -e "${YELLOW}⚠️${NC} $var_name: $var_value (expected: $expected)"
    fi
}

# 1. 環境設定ファイルの存在確認
echo "1. E2E Configuration Files Check:"
check_file ".env.e2e" "Root E2E config"
check_file "frontend/.env.e2e" "Frontend E2E config"
check_file "backend/.env.e2e" "Backend E2E config"
echo ""

# 2. 主要な環境変数の確認
echo "2. Key Environment Variables:"
if [ -f ".env.e2e" ]; then
    source .env.e2e
    
    echo "Test Mode:"
    check_env_var "NODE_ENV" "$NODE_ENV" "test"
    check_env_var "E2E_MODE" "$E2E_MODE" "true"
    
    echo ""
    echo "Service Ports:"
    check_env_var "FRONTEND_PORT" "$FRONTEND_PORT" "3001"
    check_env_var "BACKEND_PORT" "$BACKEND_PORT" "8080"
    
    echo ""
    echo "Database:"
    check_env_var "DB_HOST" "$DB_HOST" "localhost"
    check_env_var "DB_NAME" "$DB_NAME" "monstera"
    
    echo ""
    echo "Security Settings:"
    check_env_var "RATE_LIMIT_ENABLED" "$RATE_LIMIT_ENABLED" "false"
fi
echo ""

# 3. テストユーザー設定の確認
echo "3. Test User Configuration:"
if [ -f ".env.e2e" ]; then
    echo "Engineer User:"
    echo "  Email: $E2E_TEST_ENGINEER_EMAIL"
    echo "  Password: $E2E_TEST_ENGINEER_PASSWORD"
    echo "  ID: $E2E_TEST_ENGINEER_ID"
    
    echo "Sales User:"
    echo "  Email: $E2E_TEST_SALES_EMAIL"
    echo "  Password: $E2E_TEST_SALES_PASSWORD"
    echo "  ID: $E2E_TEST_SALES_ID"
    
    echo "Manager User:"
    echo "  Email: $E2E_TEST_MANAGER_EMAIL"
    echo "  Password: $E2E_TEST_MANAGER_PASSWORD"
    echo "  ID: $E2E_TEST_MANAGER_ID"
fi
echo ""

# 4. Playwright設定の確認
echo "4. Playwright Configuration:"
if [ -f "playwright.config.ts" ]; then
    echo -e "${GREEN}✅${NC} Playwright config file exists"
    
    if [ -f ".env.e2e" ]; then
        echo "Timeout Settings:"
        echo "  Navigation: ${PLAYWRIGHT_NAVIGATION_TIMEOUT}ms"
        echo "  Action: ${PLAYWRIGHT_ACTION_TIMEOUT}ms"
        echo "  Expect: ${PLAYWRIGHT_EXPECT_TIMEOUT}ms"
        
        echo "Execution Settings:"
        echo "  Workers: $PLAYWRIGHT_WORKERS"
        echo "  Retries: $PLAYWRIGHT_RETRIES"
        echo "  Headless: $PLAYWRIGHT_HEADLESS"
    fi
else
    echo -e "${RED}❌${NC} Playwright config file not found"
fi
echo ""

# 5. テストデータプレフィックスの確認
echo "5. Test Data Prefixes:"
if [ -f ".env.e2e" ]; then
    echo "  User ID Prefix: $E2E_USER_ID_PREFIX"
    echo "  Client ID Prefix: $E2E_CLIENT_ID_PREFIX"
    echo "  Project ID Prefix: $E2E_PROJECT_ID_PREFIX"
    echo "  Proposal ID Prefix: $E2E_PROPOSAL_ID_PREFIX"
    echo "  Question ID Prefix: $E2E_QUESTION_ID_PREFIX"
fi
echo ""

# 6. サービス状態の確認
echo "6. Service Status Check:"
echo -n "MySQL: "
if docker-compose ps | grep -q "mysql.*Up"; then
    echo -e "${GREEN}✅${NC} Running"
else
    echo -e "${RED}❌${NC} Not Running"
fi

echo -n "Redis: "
if docker-compose ps | grep -q "redis.*Up"; then
    echo -e "${GREEN}✅${NC} Running"
else
    echo -e "${RED}❌${NC} Not Running"
fi

echo -n "Backend: "
if docker-compose ps | grep -q "backend.*Up"; then
    echo -e "${GREEN}✅${NC} Running"
else
    echo -e "${RED}❌${NC} Not Running"
fi

echo -n "Frontend: "
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Accessible on port 3001"
else
    echo -e "${YELLOW}⚠️${NC} Not accessible on port 3001"
fi
echo ""

# 7. NPMスクリプトの確認
echo "7. NPM Scripts Check:"
if [ -f "frontend/package.json" ]; then
    echo "Available E2E test commands:"
    echo "  npm run test:e2e         - Run E2E tests"
    echo "  npm run test:e2e:ui      - Run with UI mode"
    echo "  npm run test:e2e:debug   - Run in debug mode"
    echo "  npm run test:e2e:headed  - Run with browser visible"
    echo "  npm run test:e2e:report  - Show test report"
fi
echo ""

# 8. 使用方法の表示
echo "8. Usage Instructions:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "To run E2E tests with this configuration:"
echo ""
echo "1. Start all services:"
echo "   docker-compose up -d"
echo ""
echo "2. Start frontend on port 3001:"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Run E2E tests:"
echo "   cd frontend && npm run test:e2e"
echo ""
echo "Environment variables will be loaded from:"
echo "  - .env.e2e (root directory)"
echo "  - frontend/.env.e2e (frontend specific)"
echo "  - backend/.env.e2e (backend specific)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "=== E2E Test Environment Verification Complete ==="