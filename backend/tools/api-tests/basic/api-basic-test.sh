#!/bin/bash

# =============================================================================
# Monstera API 基本テストスイート
# =============================================================================
# このスクリプトは以下のテストを統合実行します：
# 1. ヘルスチェック（/health, /ready エンドポイント）
# 2. 基本API機能（ログイン、週報、プロフィール、ダッシュボード）
# 3. 週報API型検証（statusフィールドの型チェック）
# =============================================================================

set -e

# 色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 共通設定
BASE_URL="${BASE_URL:-http://localhost:8080}"
API_URL="${BASE_URL}/api/v1"
EMAIL="${TEST_EMAIL:-testuser@duesk.co.jp}"
PASSWORD="${TEST_PASSWORD:-password123}"

# 結果カウンター
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# テスト結果を記録する関数
record_test() {
    local test_name="$1"
    local result="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ $test_name${NC}"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ $test_name${NC}"
    fi
}

# HTTPステータスコードチェック関数
check_http_status() {
    local expected="$1"
    local actual="$2"
    local test_name="$3"
    
    if [ "$actual" = "$expected" ]; then
        record_test "$test_name (HTTP $expected)" "PASS"
        return 0
    else
        record_test "$test_name (Expected: $expected, Got: $actual)" "FAIL"
        return 1
    fi
}

# JSONレスポンスチェック関数
check_json_field() {
    local json="$1"
    local field="$2"
    local expected_type="$3"
    local test_name="$4"
    
    local value=$(echo "$json" | jq -r ".$field // \"null\"")
    local actual_type=$(echo "$json" | jq -r ".$field | type // \"null\"")
    
    if [ "$actual_type" = "$expected_type" ]; then
        record_test "$test_name.$field is $expected_type" "PASS"
        return 0
    else
        record_test "$test_name.$field (Expected: $expected_type, Got: $actual_type)" "FAIL"
        return 1
    fi
}

echo "========================================="
echo -e "${BLUE}Monstera API 基本テストスイート${NC}"
echo "========================================="
echo "API URL: $API_URL"
echo "Test User: $EMAIL"
echo ""

# =============================================================================
# 1. ヘルスチェックテスト
# =============================================================================
echo -e "\n${YELLOW}=== 1. ヘルスチェックテスト ===${NC}"

# /health エンドポイント
echo -e "\n${BLUE}[1.1] /health エンドポイント${NC}"
HEALTH_RESPONSE=$(curl -s -w '\n%{http_code}' "${BASE_URL}/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

check_http_status "200" "$HTTP_CODE" "/health"
if [ -n "$BODY" ]; then
    check_json_field "$BODY" "status" "string" "/health response"
fi

# /ready エンドポイント
echo -e "\n${BLUE}[1.2] /ready エンドポイント${NC}"
READY_RESPONSE=$(curl -s -w '\n%{http_code}' "${BASE_URL}/ready")
HTTP_CODE=$(echo "$READY_RESPONSE" | tail -n1)
BODY=$(echo "$READY_RESPONSE" | head -n-1)

check_http_status "200" "$HTTP_CODE" "/ready"
if [ -n "$BODY" ]; then
    check_json_field "$BODY" "status" "string" "/ready response"
    check_json_field "$BODY" "database" "string" "/ready response"
fi

# =============================================================================
# 2. 認証とトークン取得
# =============================================================================
echo -e "\n${YELLOW}=== 2. 認証テスト ===${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  -c cookie.txt)

if echo "$LOGIN_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
    record_test "ログイン成功" "PASS"
    echo -e "${GREEN}Token: ${TOKEN:0:20}...${NC}"
else
    record_test "ログイン失敗" "FAIL"
    echo -e "${RED}Error: $LOGIN_RESPONSE${NC}"
    exit 1
fi

# =============================================================================
# 3. 基本API機能テスト
# =============================================================================
echo -e "\n${YELLOW}=== 3. 基本API機能テスト ===${NC}"

# 3.1 プロフィール取得
echo -e "\n${BLUE}[3.1] プロフィール取得${NC}"
PROFILE_RESPONSE=$(curl -s -w '\n%{http_code}' -X GET "${API_URL}/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -b cookie.txt)
HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
BODY=$(echo "$PROFILE_RESPONSE" | head -n-1)

check_http_status "200" "$HTTP_CODE" "GET /profile"
if [ "$HTTP_CODE" = "200" ] && [ -n "$BODY" ]; then
    check_json_field "$BODY" "user_id" "string" "Profile"
    check_json_field "$BODY" "name" "string" "Profile"
    check_json_field "$BODY" "email" "string" "Profile"
fi

# 3.2 週報一覧取得
echo -e "\n${BLUE}[3.2] 週報一覧取得${NC}"
WEEKLY_REPORTS_RESPONSE=$(curl -s -w '\n%{http_code}' -X GET "${API_URL}/weekly-reports" \
  -H "Authorization: Bearer $TOKEN" \
  -b cookie.txt)
HTTP_CODE=$(echo "$WEEKLY_REPORTS_RESPONSE" | tail -n1)
BODY=$(echo "$WEEKLY_REPORTS_RESPONSE" | head -n-1)

check_http_status "200" "$HTTP_CODE" "GET /weekly-reports"
if [ "$HTTP_CODE" = "200" ] && [ -n "$BODY" ]; then
    # 配列かオブジェクトかチェック
    TYPE=$(echo "$BODY" | jq -r 'type')
    if [ "$TYPE" = "array" ]; then
        record_test "週報一覧は配列形式" "PASS"
        
        # 最初の週報の型チェック
        FIRST_REPORT=$(echo "$BODY" | jq -r '.[0] // empty')
        if [ -n "$FIRST_REPORT" ]; then
            check_json_field "$FIRST_REPORT" "id" "string" "WeeklyReport"
            check_json_field "$FIRST_REPORT" "week_start_date" "string" "WeeklyReport"
            
            # statusフィールドの型検証（重要）
            STATUS_TYPE=$(echo "$FIRST_REPORT" | jq -r '.status | type // "null"')
            if [ "$STATUS_TYPE" = "number" ]; then
                record_test "週報status is number (正しい)" "PASS"
            else
                record_test "週報status is $STATUS_TYPE (数値型であるべき)" "FAIL"
            fi
        fi
    elif [ "$TYPE" = "object" ] && echo "$BODY" | jq -e '.reports' > /dev/null 2>&1; then
        record_test "週報一覧はオブジェクト形式（reportsフィールド）" "PASS"
        
        # reports配列の最初の要素をチェック
        FIRST_REPORT=$(echo "$BODY" | jq -r '.reports[0] // empty')
        if [ -n "$FIRST_REPORT" ]; then
            STATUS_TYPE=$(echo "$FIRST_REPORT" | jq -r '.status | type // "null"')
            if [ "$STATUS_TYPE" = "number" ]; then
                record_test "週報status is number (正しい)" "PASS"
            else
                record_test "週報status is $STATUS_TYPE (数値型であるべき)" "FAIL"
            fi
        fi
    else
        record_test "週報一覧の形式が不明" "FAIL"
    fi
fi

# 3.3 管理者ダッシュボード
echo -e "\n${BLUE}[3.3] 管理者ダッシュボード${NC}"
DASHBOARD_RESPONSE=$(curl -s -w '\n%{http_code}' -X GET "${API_URL}/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  -b cookie.txt)
HTTP_CODE=$(echo "$DASHBOARD_RESPONSE" | tail -n1)

# 管理者権限がない場合は403が期待される
if [ "$HTTP_CODE" = "200" ]; then
    record_test "管理者ダッシュボードアクセス (管理者権限あり)" "PASS"
elif [ "$HTTP_CODE" = "403" ]; then
    record_test "管理者ダッシュボードアクセス (一般ユーザー)" "PASS"
else
    record_test "管理者ダッシュボードアクセス (予期しないステータス: $HTTP_CODE)" "FAIL"
fi

# =============================================================================
# 4. 週報API型検証（詳細）
# =============================================================================
echo -e "\n${YELLOW}=== 4. 週報API型検証テスト ===${NC}"

# 特定の週の週報を取得してstatusフィールドを詳細にチェック
CURRENT_WEEK=$(date +%Y-%m-%d)
WEEK_REPORT_RESPONSE=$(curl -s -X GET "${API_URL}/weekly-reports?week=${CURRENT_WEEK}" \
  -H "Authorization: Bearer $TOKEN" \
  -b cookie.txt)

if echo "$WEEK_REPORT_RESPONSE" | jq -e '.' > /dev/null 2>&1; then
    # daily_recordsのstatusフィールドチェック
    DAILY_RECORDS=$(echo "$WEEK_REPORT_RESPONSE" | jq -r '.daily_records // .reports[0].daily_records // empty')
    if [ -n "$DAILY_RECORDS" ]; then
        echo -e "\n${BLUE}[4.1] daily_records status型チェック${NC}"
        
        # 各日のレコードをチェック
        for i in {0..6}; do
            RECORD=$(echo "$DAILY_RECORDS" | jq -r ".[$i] // empty")
            if [ -n "$RECORD" ] && [ "$RECORD" != "null" ]; then
                STATUS_TYPE=$(echo "$RECORD" | jq -r '.status | type // "null"')
                DATE=$(echo "$RECORD" | jq -r '.date // "unknown"')
                
                if [ "$STATUS_TYPE" = "number" ]; then
                    record_test "daily_record[$DATE].status is number" "PASS"
                else
                    record_test "daily_record[$DATE].status is $STATUS_TYPE (should be number)" "FAIL"
                fi
            fi
        done
    fi
fi

# =============================================================================
# 5. クリーンアップ
# =============================================================================
rm -f cookie.txt

# =============================================================================
# 6. テスト結果サマリー
# =============================================================================
echo -e "\n${YELLOW}=========================================${NC}"
echo -e "${YELLOW}テスト結果サマリー${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo -e "総テスト数: ${TOTAL_TESTS}"
echo -e "${GREEN}成功: ${PASSED_TESTS}${NC}"
echo -e "${RED}失敗: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ すべてのテストが成功しました！${NC}"
    exit 0
else
    echo -e "\n${RED}❌ ${FAILED_TESTS}個のテストが失敗しました${NC}"
    exit 1
fi