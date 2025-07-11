#!/bin/bash

echo "=== Manual Login Test Execution ==="
echo ""

# バックエンドの起動確認
echo "1. Backend Health Check:"
backend_health=$(curl -s http://localhost:8080/api/v1/health)
if [ "$backend_health" = "404 page not found" ]; then
    echo "❌ Backend health endpoint not found"
    echo "Checking if backend is running..."
    if docker-compose ps | grep backend | grep -q "Up"; then
        echo "✅ Backend container is running"
    else
        echo "❌ Backend container is not running"
        exit 1
    fi
else
    echo "✅ Backend is responding: $backend_health"
fi

# フロントエンドの起動確認
echo ""
echo "2. Frontend Accessibility Check:"
frontend_response=$(curl -s http://localhost:3001)
if echo "$frontend_response" | grep -q "login"; then
    echo "✅ Frontend is accessible and redirecting to login"
else
    echo "❌ Frontend is not responding correctly"
    echo "Response: $frontend_response"
fi

# テストユーザー情報の確認
echo ""
echo "3. Test User Data Verification:"
docker-compose exec mysql mysql -u root -proot monstera -e "
    SELECT 
        email, 
        role,
        active,
        'Password: Test1234!' as password_info
    FROM users 
    WHERE email LIKE '%_test@duesk.co.jp' 
    ORDER BY email;
" 2>&1 | grep -v "Warning"

echo ""
echo "4. Test Login Instructions:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Please open your browser and navigate to: http://localhost:3001"
echo ""
echo "📋 Test Users Available:"
echo "  1. Engineer User:"
echo "     📧 Email: engineer_test@duesk.co.jp"
echo "     🔑 Password: Test1234!"
echo "     👤 Role: 4 (Employee)"
echo ""
echo "  2. Sales User:"
echo "     📧 Email: sales_test@duesk.co.jp"
echo "     🔑 Password: Test1234!"
echo "     👤 Role: 4 (Employee - workaround for role 6 issue)"
echo ""
echo "  3. Manager User:"
echo "     📧 Email: manager_test@duesk.co.jp"
echo "     🔑 Password: Test1234!"
echo "     👤 Role: 3 (Manager)"
echo ""
echo "✅ Expected Login Flow:"
echo "  1. Browser should show login form"
echo "  2. Enter test user credentials"
echo "  3. After successful login, should be redirected to dashboard/proposals page"
echo "  4. User profile should display in header/sidebar"
echo ""
echo "🧪 Manual Test Steps:"
echo "  1. Navigate to http://localhost:3001"
echo "  2. Confirm login form is displayed"
echo "  3. Try logging in with engineer_test@duesk.co.jp / Test1234!"
echo "  4. Verify successful login and data display"
echo "  5. Check if proposals are visible (should see 5 proposals for engineer user)"
echo "  6. Log out and try other test users"
echo ""
echo "⚠️  If login fails, check:"
echo "  - Backend logs: docker-compose logs backend"
echo "  - MySQL connection: docker-compose exec mysql mysql -u root -proot monstera"
echo "  - Network connectivity between frontend (3001) and backend (8080)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 自動ログインテスト（API直接呼び出し）
echo ""
echo "5. API Login Test (Automated):"
echo "Testing engineer login via API..."

# ログインAPIテスト
login_response=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "engineer_test@duesk.co.jp",
    "password": "Test1234!"
  }' \
  -c cookies.txt)

if echo "$login_response" | grep -q "token\|success"; then
    echo "✅ API login successful"
    echo "Response: $login_response"
    
    # プロファイル取得テスト
    echo ""
    echo "Testing profile retrieval..."
    profile_response=$(curl -s http://localhost:8080/api/v1/profile \
      -b cookies.txt)
    
    if echo "$profile_response" | grep -q "engineer_test"; then
        echo "✅ Profile retrieval successful"
        echo "Profile: $profile_response"
    else
        echo "❌ Profile retrieval failed"
        echo "Response: $profile_response"
    fi
    
else
    echo "❌ API login failed"
    echo "Response: $login_response"
    
    # エラー詳細を確認
    echo ""
    echo "Checking backend logs for login errors..."
    docker-compose logs --tail=10 backend | grep -i "login\|auth\|error"
fi

echo ""
echo "=== Manual Login Test Setup Complete ==="
echo "Please follow the manual test instructions above to verify login functionality."