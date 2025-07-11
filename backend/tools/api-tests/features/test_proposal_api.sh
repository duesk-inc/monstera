#!/bin/bash

# 提案情報確認機能 API自動テストスクリプト

set -e

# 色付き出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
BASE_URL="${BASE_URL:-http://localhost:8080}"
TEST_EMAIL="${TEST_EMAIL:-engineer_test@duesk.co.jp}"
TEST_PASSWORD="${TEST_PASSWORD:-password}"
SALES_EMAIL="${SALES_EMAIL:-sales_test@duesk.co.jp}"
SALES_PASSWORD="${SALES_PASSWORD:-password}"

# テスト結果保存用
RESULTS_FILE="api_test_results_$(date +%Y%m%d_%H%M%S).json"
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}提案情報確認機能 API自動テスト${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "ベースURL: $BASE_URL"
echo "結果ファイル: $RESULTS_FILE"
echo ""

# JSON出力初期化
echo '{
  "test_run": {
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "base_url": "'$BASE_URL'",
    "results": []
  }
}' > "$RESULTS_FILE"

# ヘルパー関数
log_test() {
    local test_name="$1"
    local status="$2"
    local response="$3"
    local expected="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $test_name${NC}"
        echo -e "${RED}   Expected: $expected${NC}"
        echo -e "${RED}   Got: $response${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    # JSON結果に追加
    local temp_file=$(mktemp)
    jq --arg name "$test_name" \
       --arg status "$status" \
       --arg response "$response" \
       --arg expected "$expected" \
       '.test_run.results += [{
         "name": $name,
         "status": $status,
         "response": $response,
         "expected": $expected,
         "timestamp": now | todateiso8601
       }]' "$RESULTS_FILE" > "$temp_file" && mv "$temp_file" "$RESULTS_FILE"
}

# APIテスト用関数
test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local headers="$4"
    local body="$5"
    local expected_status="$6"
    local expected_key="$7"
    
    echo -n "Testing: $name..."
    
    local response
    local status_code
    
    if [ -n "$body" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                   -X "$method" \
                   -H "Content-Type: application/json" \
                   $headers \
                   -d "$body" \
                   "$BASE_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                   -X "$method" \
                   $headers \
                   "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    status_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    response_body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$status_code" = "$expected_status" ]; then
        if [ -n "$expected_key" ]; then
            if echo "$response_body" | jq -e ".$expected_key" >/dev/null 2>&1; then
                log_test "$name" "PASS" "Status: $status_code, Key exists: $expected_key" "Status: $expected_status"
            else
                log_test "$name" "FAIL" "Status: $status_code, Missing key: $expected_key" "Status: $expected_status with key: $expected_key"
            fi
        else
            log_test "$name" "PASS" "Status: $status_code" "Status: $expected_status"
        fi
    else
        log_test "$name" "FAIL" "Status: $status_code, Body: $response_body" "Status: $expected_status"
    fi
    
    echo "$response_body"
}

# 認証トークン取得
echo -e "${YELLOW}🔐 認証トークンを取得中...${NC}"

# エンジニアトークン
engineer_login_response=$(test_api \
    "Engineer Login" \
    "POST" \
    "/api/v1/auth/login" \
    "" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "200" \
    "token")

AUTH_TOKEN=$(echo "$engineer_login_response" | jq -r '.token // empty')

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}❌ エンジニア認証に失敗しました${NC}"
    exit 1
fi

echo -e "${GREEN}✅ エンジニア認証成功${NC}"

# 営業トークン
sales_login_response=$(test_api \
    "Sales Login" \
    "POST" \
    "/api/v1/auth/login" \
    "" \
    "{\"email\":\"$SALES_EMAIL\",\"password\":\"$SALES_PASSWORD\"}" \
    "200" \
    "token")

SALES_TOKEN=$(echo "$sales_login_response" | jq -r '.token // empty')

if [ -z "$SALES_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  営業認証に失敗しました（営業ユーザーが存在しない可能性があります）${NC}"
    SALES_TOKEN=""
fi

echo ""

# 提案管理のテスト
echo -e "${YELLOW}📋 提案管理機能のテスト${NC}"

# 1. 提案一覧取得
proposals_response=$(test_api \
    "Get Proposals List" \
    "GET" \
    "/api/v1/proposals" \
    "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
    "" \
    "200" \
    "items")

PROPOSAL_ID=$(echo "$proposals_response" | jq -r '.items[0].id // empty')

# 2. 提案一覧取得（フィルター付き）
test_api \
    "Get Proposals with Status Filter" \
    "GET" \
    "/api/v1/proposals?status=proposed&page=1&limit=10" \
    "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
    "" \
    "200" \
    "items"

# 3. 提案詳細取得
if [ -n "$PROPOSAL_ID" ]; then
    proposal_detail_response=$(test_api \
        "Get Proposal Detail" \
        "GET" \
        "/api/v1/proposals/$PROPOSAL_ID" \
        "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
        "" \
        "200" \
        "project")
    
    # 4. 提案ステータス更新
    test_api \
        "Update Proposal Status to Proceed" \
        "PUT" \
        "/api/v1/proposals/$PROPOSAL_ID/status" \
        "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
        "{\"status\":\"proceed\"}" \
        "200" \
        "message"
else
    echo -e "${YELLOW}⚠️  提案IDが取得できませんでした。提案詳細とステータス更新のテストをスキップします${NC}"
fi

echo ""

# 質問管理のテスト
echo -e "${YELLOW}❓ 質問管理機能のテスト${NC}"

if [ -n "$PROPOSAL_ID" ]; then
    # 5. 質問投稿
    question_response=$(test_api \
        "Create Question" \
        "POST" \
        "/api/v1/proposals/$PROPOSAL_ID/questions" \
        "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
        "{\"question_text\":\"テスト質問です。開発環境について教えてください。\"}" \
        "201" \
        "id")
    
    QUESTION_ID=$(echo "$question_response" | jq -r '.id // empty')
    
    # 6. 質問一覧取得
    test_api \
        "Get Questions List" \
        "GET" \
        "/api/v1/proposals/$PROPOSAL_ID/questions" \
        "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
        "" \
        "200" \
        "."
    
    if [ -n "$QUESTION_ID" ]; then
        # 7. 質問更新
        test_api \
            "Update Question" \
            "PUT" \
            "/api/v1/questions/$QUESTION_ID" \
            "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
            "{\"question_text\":\"更新されたテスト質問です。\"}" \
            "200" \
            "message"
    fi
else
    echo -e "${YELLOW}⚠️  提案IDが取得できませんでした。質問関連のテストをスキップします${NC}"
fi

echo ""

# 営業機能のテスト
echo -e "${YELLOW}💼 営業機能のテスト${NC}"

if [ -n "$SALES_TOKEN" ]; then
    # 8. 未回答質問一覧取得
    test_api \
        "Get Pending Questions" \
        "GET" \
        "/api/v1/sales/questions/pending" \
        "-H \"Authorization: Bearer $SALES_TOKEN\"" \
        "" \
        "200" \
        "items"
    
    if [ -n "$QUESTION_ID" ]; then
        # 9. 質問回答
        test_api \
            "Respond to Question" \
            "PUT" \
            "/api/v1/questions/$QUESTION_ID/response" \
            "-H \"Authorization: Bearer $SALES_TOKEN\"" \
            "{\"response_text\":\"テスト回答です。Dockerを使用します。\"}" \
            "200" \
            "message"
    fi
else
    echo -e "${YELLOW}⚠️  営業トークンが取得できませんでした。営業機能のテストをスキップします${NC}"
fi

echo ""

# 統計機能のテスト
echo -e "${YELLOW}📊 統計機能のテスト${NC}"

# 10. 提案統計取得
test_api \
    "Get Proposal Stats" \
    "GET" \
    "/api/v1/proposals/stats" \
    "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
    "" \
    "200" \
    "."

# 11. ダッシュボード取得
test_api \
    "Get Proposal Dashboard" \
    "GET" \
    "/api/v1/proposals/dashboard" \
    "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
    "" \
    "200" \
    "."

echo ""

# エラーケースのテスト
echo -e "${YELLOW}🚨 エラーケースのテスト${NC}"

# 12. 無効なID
test_api \
    "Invalid Proposal ID" \
    "GET" \
    "/api/v1/proposals/invalid-id" \
    "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
    "" \
    "400" \
    "error"

# 13. 認証なし
test_api \
    "Unauthorized Access" \
    "GET" \
    "/api/v1/proposals" \
    "" \
    "" \
    "401" \
    "error"

# 14. 無効なステータス
if [ -n "$PROPOSAL_ID" ]; then
    test_api \
        "Invalid Status Update" \
        "PUT" \
        "/api/v1/proposals/$PROPOSAL_ID/status" \
        "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
        "{\"status\":\"invalid_status\"}" \
        "400" \
        "error"
fi

# クリーンアップ（作成したテストデータの削除）
echo ""
echo -e "${YELLOW}🧹 クリーンアップ中...${NC}"

if [ -n "$QUESTION_ID" ]; then
    test_api \
        "Delete Test Question" \
        "DELETE" \
        "/api/v1/questions/$QUESTION_ID" \
        "-H \"Authorization: Bearer $AUTH_TOKEN\"" \
        "" \
        "200" \
        "message"
fi

# 結果サマリー
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}テスト結果サマリー${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "総テスト数: ${TOTAL_TESTS}"
echo -e "${GREEN}成功: ${PASSED_TESTS}${NC}"
echo -e "${RED}失敗: ${FAILED_TESTS}${NC}"
echo -e "成功率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo ""
echo "詳細結果: $RESULTS_FILE"

# 結果ファイルの最終更新
temp_file=$(mktemp)
jq --arg passed "$PASSED_TESTS" \
   --arg failed "$FAILED_TESTS" \
   --arg total "$TOTAL_TESTS" \
   '.test_run.summary = {
     "passed": ($passed | tonumber),
     "failed": ($failed | tonumber),
     "total": ($total | tonumber),
     "success_rate": (($passed | tonumber) * 100 / ($total | tonumber))
   }' "$RESULTS_FILE" > "$temp_file" && mv "$temp_file" "$RESULTS_FILE"

# 終了コード設定
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 全てのテストが成功しました！${NC}"
    exit 0
else
    echo -e "${RED}💥 一部のテストが失敗しました${NC}"
    exit 1
fi